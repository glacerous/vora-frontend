"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";

// ── Shared sub-components ───────────────────────────────────────────────────

const UiverseLoader = () => (
  <div className="newtons-cradle">
    <div className="newtons-cradle__dot"></div>
    <div className="newtons-cradle__dot"></div>
    <div className="newtons-cradle__dot"></div>
    <div className="newtons-cradle__dot"></div>
  </div>
);

// ── Types ───────────────────────────────────────────────────────────────────

interface ScanRecord {
  id: number;
  scan_date: string;
  tree_code: string;
  dbh_cm: number | null;
  tinggi_m: number | null;
  biomassa_kg: number | null;
  karbon_kg: number | null;
  co2e_kg: number | null;
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
  agb_kg?: number | null;
  bgb_kg?: number | null;
  gps_lat?: number | null;
  gps_lon?: number | null;
  thumbnail_url?: string;
  scale_status?: string;
  scale_factor_used?: number;
  calibration_source?: string;
  height_used?: string;
  total_height_used_m?: number | null;
  segment_height_m?: number | null;
  height_fallback_reason?: string;
  height_validated?: boolean;
  height_validation_reason?: string;
  quality_status?: string;
  root_to_shoot_ratio?: number;
  co2e_uncertainty_pct?: number;
  co2e_low_kg?: number | null;
  co2e_high_kg?: number | null;
  plot_id?: number | null;
  claimed_by_user_id?: number | null;
}

// ── Main Page Component ─────────────────────────────────────────────────────

export default function Reconstruct() {
  const router = useRouter();

  // Phase management
  const [phase, setPhase] = useState<"upload" | "marking" | "processing" | "result">("upload");

  // Upload form states
  const [activeTab, setActiveTab] = useState<"video" | "photos">("video");
  const [treeCode, setTreeCode] = useState("");
  const [frames, setFrames] = useState(60);
  const [blurThresh, setBlurThresh] = useState(80);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [removeBackground] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const isCancelledRef = React.useRef(false);

  // Marking (Phase 2) states
  const [calibrationCode, setCalibrationCode] = useState("");
  const [calibrationPoints, setCalibrationPoints] = useState<Array<{x: number, y: number, dispWidth: number, dispHeight: number}>>([]);
  const [calibrationImgSize, setCalibrationImgSize] = useState<{width: number, height: number} | null>(null);
  const [calibrationMousePos, setCalibrationMousePos] = useState<{x: number, y: number} | null>(null);

  // Processing (Phase 3) states
  const [pipelineStatus, setPipelineStatus] = useState<any>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Result (Phase 4) states — mirrors original estimator/page.tsx exactly
  const [activeTreeCode, setActiveTreeCode] = useState("");
  const [currentScan, setCurrentScan] = useState<ScanRecord | null>(null);
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);

  // States for optional authentication and plot claiming
  const { user: currentUser } = useAuth();
  const [userPlots, setUserPlots] = useState<any[]>([]);
  const [selectedPlotId, setSelectedPlotId] = useState<string>("");
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Fetch user plots when view result is shown
  useEffect(() => {
    if (!currentUser) {
      setUserPlots([]);
      return;
    }

    const fetchPlots = async () => {
      try {
        const plotsRes = await fetch(`${BACKEND_URL}/users/${currentUser.id}/plots`, {
          credentials: "include",
        });
        if (plotsRes.ok) {
          const plotsData = await plotsRes.json();
          setUserPlots(plotsData.plots || []);
          if (plotsData.plots && plotsData.plots.length > 0) {
            setSelectedPlotId(plotsData.plots[0].id.toString());
          }
        }
      } catch (err) {
        console.error("Gagal mengambil plot user:", err);
      }
    };

    fetchPlots();
  }, [phase, currentScan?.id, currentUser]);

  const getSpeciesPredictions = (scan: any) => {
    if (!scan || !scan.species_predictions) return [];
    let preds = scan.species_predictions;
    if (typeof preds === "string") {
      try {
        preds = JSON.parse(preds);
      } catch {
        return [];
      }
    }
    if (typeof preds === "string") {
      try {
        preds = JSON.parse(preds);
      } catch {
        return [];
      }
    }
    return Array.isArray(preds) ? preds : [];
  };

  const predictions = getSpeciesPredictions(currentScan);

  // Recalibration modal states (in Result phase)
  const [recalibModalOpen, setRecalibModalOpen] = useState(false);
  const [clickedPoints, setClickedPoints] = useState<Array<{x: number, y: number, dispWidth: number, dispHeight: number}>>([]);
  const [imgDimensions, setImgDimensions] = useState<{width: number, height: number} | null>(null);
  const [recalibLoading, setRecalibLoading] = useState(false);
  const [recalibError, setRecalibError] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{x: number, y: number} | null>(null);
  const [isEditing3D, setIsEditing3D] = useState(false);
  const lastSplatUrlRef = useRef<string | null>(null);

  // ── URL sync helper ──────────────────────────────────────────────────────

  /**
   * FIX 2: Update the URL query params any time phase or activeTreeCode changes
   * using router.replace (shallow, no full page reload).
   */
  const syncUrl = (newPhase: typeof phase, code?: string) => {
    const params = new URLSearchParams();
    if (code) params.set("code", code);
    if (newPhase !== "upload") params.set("phase", newPhase);
    const queryStr = params.toString();
    router.replace(`/reconstruct${queryStr ? `?${queryStr}` : ""}`, { scroll: false });
  };

  // Wrapped setPhase that also syncs the URL
  const transitionPhase = (newPhase: typeof phase, code?: string) => {
    setPhase(newPhase);
    syncUrl(newPhase, code ?? (activeTreeCode || undefined));
  };

  // ── Data fetching ────────────────────────────────────────────────────────

  /**
   * FIX 1: Fetch tree history with retry to handle D1 write-lag.
   * After reconstruction completes, the record may take 1-3 seconds to appear
   * in D1. We retry up to `maxRetries` times with `delayMs` between attempts.
   */
  const fetchTreeHistoryWithRetry = async (
    code: string,
    maxRetries = 5,
    delayMs = 2000
  ): Promise<void> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(`${BACKEND_URL}/history/${code}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success && data.history && data.history.length > 0) {
          setHistory(data.history);
          setCurrentScan(data.history[0]);
          setSidebarOpen(true);
          setError(null);
          return; // success
        }
        // history is empty — may be a D1 write lag; retry unless last attempt
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      } catch (err: any) {
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, delayMs));
        } else {
          setError(err.message || "Failed to load scan data.");
          setHistory([]);
          setCurrentScan(null);
        }
      }
    }
    // Exhausted retries
    setError(`No scan data found for "${code}" after waiting. The pipeline may have failed.`);
    setHistory([]);
    setCurrentScan(null);
  };

  const fetchTreeHistory = async (code: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/history/${code}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

  // ── On-mount URL reading (FIX 2) ────────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const urlPhase = params.get("phase") as typeof phase | null;

    if (code) {
      setActiveTreeCode(code);
      if (urlPhase === "processing") {
        // Resume polling — user refreshed during processing
        setCalibrationCode(code);
        setPhase("processing");
      } else {
        // Result view — direct load or ?phase=result
        setPhase("result");
        fetchTreeHistory(code);
      }
    }
    // If no code, stay on upload phase (default)
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Phase 3 polling ──────────────────────────────────────────────────────

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (phase === "processing") {
      const poll = async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/status`);
          if (res.ok) {
            const data = await res.json();
            setPipelineStatus(data);
            if (data.stage === "done" && data.tree_code === calibrationCode) {
              // FIX 1: use retry-enabled fetch so D1 write-lag is handled
              const code = calibrationCode;
              setPhase("result");
              setActiveTreeCode(code);
              syncUrl("result", code);
              setLoading(true);
              await fetchTreeHistoryWithRetry(code);
              setLoading(false);
            } else if (data.stage === "error") {
              setError(data.error || "Reconstruction failed");
              transitionPhase("upload");
              setLoading(false);
            }
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      };
      poll();
      interval = setInterval(poll, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [phase, calibrationCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timer for Phase 3 ───────────────────────────────────────────────────

  useEffect(() => {
    if (phase === "processing") {
      if (!timerRef.current) {
        setElapsedTime(0);
        timerRef.current = setInterval(() => {
          setElapsedTime((prev) => prev + 1);
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
  }, [phase]);

  // ── Iframe message listener ──────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data === "vora_scene_loaded") {
        setSceneLoaded(true);
      } else if (e.data?.type === "vora_metrics_updated") {
        setIsEditing3D(false);
        if (e.data.tree_code) {
          fetchTreeHistory(e.data.tree_code);
          const iframe = document.querySelector("iframe");
          if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage({ type: "vora_metrics_updated", tree_code: e.data.tree_code }, "*");
          }
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scene reload guard ───────────────────────────────────────────────────

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

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleClaimScan = async () => {
    if (!currentScan || !selectedPlotId) return;
    setClaiming(true);
    setClaimError(null);
    setClaimSuccess(false);

    try {
      const res = await fetch(`${BACKEND_URL}/plots/${selectedPlotId}/claim-scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tree_code: currentScan.tree_code }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Gagal mengklaim scan");
      }

      setClaimSuccess(true);
      setCurrentScan(prev => {
        if (!prev) return null;
        return {
          ...prev,
          claimed_by_user_id: currentUser?.id,
          plot_id: parseInt(selectedPlotId),
        };
      });
    } catch (err: any) {
      setClaimError(err.message || "Gagal mengklaim scan");
    } finally {
      setClaiming(false);
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
        (clickedPoints[0].y / clickedPoints[0].dispHeight) * H_org,
      ];
      const p2_org = [
        (clickedPoints[1].x / clickedPoints[1].dispWidth) * W_org,
        (clickedPoints[1].y / clickedPoints[1].dispHeight) * H_org,
      ];

      const res = await fetch(`${BACKEND_URL}/scan/${currentScan.id}/recalculate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p1: p1_org, p2: p2_org, width: W_org, height: H_org }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to recalculate scan");

      await fetchTreeHistory(currentScan.tree_code);
      setRecalibModalOpen(false);
      setClickedPoints([]);

      const iframe = document.querySelector("iframe");
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          { type: "vora_metrics_updated", tree_code: currentScan.tree_code },
          "*"
        );
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
      height: e.currentTarget.naturalHeight,
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (treeCode.trim()) {
      const code = treeCode.trim();
      setActiveTreeCode(code);
      syncUrl("result", code);
      fetchTreeHistory(code);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
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

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setVideoFile(e.target.files[0]);
      setError(null);
    }
  };

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setPhotoFiles(e.target.files);
      setError(null);
    }
  };

  const handleCopy = async () => {
    if (!submittedCode) return;
    try {
      await navigator.clipboard.writeText(submittedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = submittedCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCancel = async () => {
    try {
      isCancelledRef.current = true;
      setProgressMsg("Cancelling active job...");
      await fetch(`${BACKEND_URL}/cancel`, { method: "POST" });
    } catch {}
    setLoading(false);
    setProgressMsg("");
    setError("Reconstruction cancelled.");
  };

  const startReconstructPayload = async (
    code: string,
    p1: number[] | null,
    p2: number[] | null,
    width: number | null,
    height: number | null
  ) => {
    try {
      const r = await fetch(`${BACKEND_URL}/reconstruct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tree_code: code,
          remove_background: removeBackground,
          gps_lat: latitude ? parseFloat(latitude) : null,
          gps_lon: longitude ? parseFloat(longitude) : null,
          p1,
          p2,
          width,
          height,
        }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d?.detail || "Reconstruction queuing failed");
      }

      const data = await r.json();
      const finalCode = data.tree_code || code;

      // Transition to Phase 3: Processing — sync URL
      setCalibrationCode(finalCode);
      setActiveTreeCode(finalCode);
      setLoading(false);
      transitionPhase("processing", finalCode);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  const handleSkipAndAutoReconstruct = async () => {
    setLoading(true);
    setProgressMsg("Starting GPU reconstruction (Auto-detect)…");
    await startReconstructPayload(calibrationCode, null, null, null, null);
  };

  const handleManualReconstruct = async () => {
    if (calibrationPoints.length < 2 || !calibrationImgSize) return;
    setLoading(true);
    setProgressMsg("Starting GPU reconstruction (Manual axis)…");

    const W_org = calibrationImgSize.width;
    const H_org = calibrationImgSize.height;
    const p1_org = [
      (calibrationPoints[0].x / calibrationPoints[0].dispWidth) * W_org,
      (calibrationPoints[0].y / calibrationPoints[0].dispHeight) * H_org,
    ];
    const p2_org = [
      (calibrationPoints[1].x / calibrationPoints[1].dispWidth) * W_org,
      (calibrationPoints[1].y / calibrationPoints[1].dispHeight) * H_org,
    ];

    await startReconstructPayload(calibrationCode, p1_org, p2_org, W_org, H_org);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    isCancelledRef.current = false;
    setError(null);
    setSubmittedCode(null);
    const selectedCode =
      treeCode.trim() || `POHON-${Math.floor(1000 + Math.random() * 9000)}`;

    if (activeTab === "video" && !videoFile) {
      setError("Please select a video file.");
      return;
    }
    if (activeTab === "photos" && !photoFiles?.length) {
      setError("Please select at least one photo.");
      return;
    }

    setLoading(true);
    try {
      if (activeTab === "video" && videoFile) {
        setProgressMsg("Uploading video…");
        const fd = new FormData();
        fd.append("video", videoFile);
        fd.append("frames", frames.toString());
        fd.append("blur_thresh", blurThresh.toString());
        const r = await fetch(`${BACKEND_URL}/upload_video`, {
          method: "POST",
          body: fd,
        });
        if (!r.ok) {
          const d = await r.json();
          throw new Error(d?.detail || "Video upload failed");
        }

        let isExtracted = false;
        let attempts = 0;
        const maxAttempts = 100;
        const pollInterval = 1500;

        setProgressMsg("Uploading complete. Waiting for server to start frame extraction…");

        while (!isExtracted) {
          if (attempts >= maxAttempts) {
            throw new Error(
              "Frame extraction took too long. Please try a shorter video walkthrough."
            );
          }
          if (isCancelledRef.current) throw new Error("Reconstruction cancelled.");
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          attempts++;
          if (isCancelledRef.current) throw new Error("Reconstruction cancelled.");

          const statusRes = await fetch(`${BACKEND_URL}/status`);
          if (!statusRes.ok) continue;

          const statusData = await statusRes.json();
          if (statusData.stage === "error") {
            throw new Error(statusData.error || "Frame extraction failed on the server.");
          }
          if (statusData.stage === "extracted") {
            isExtracted = true;
          } else if (statusData.stage === "extracting") {
            setProgressMsg(`Extracting frames: ${statusData.message}`);
          }
        }
      } else if (activeTab === "photos" && photoFiles) {
        setProgressMsg(`Uploading ${photoFiles.length} photos…`);
        const fd = new FormData();
        for (let i = 0; i < photoFiles.length; i++) fd.append("photos", photoFiles[i]);
        const r = await fetch(`${BACKEND_URL}/use_photos`, { method: "POST", body: fd });
        if (!r.ok) {
          const d = await r.json();
          throw new Error(d?.detail || "Photos upload failed");
        }
      }

      // Transition to Trunk Marking (Phase 2)
      setCalibrationCode(selectedCode);
      setCalibrationPoints([]);
      setCalibrationMousePos(null);
      setLoading(false);
      transitionPhase("marking", selectedCode);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  // ── Stepper Component ────────────────────────────────────────────────────

  const Stepper = ({
    currentPhase,
  }: {
    currentPhase: "upload" | "marking" | "processing" | "result";
  }) => {
    const steps = [
      { key: "upload", label: "Upload Walkthrough" },
      { key: "marking", label: "Mark Trunk Axis" },
      { key: "processing", label: "GPU Processing" },
      { key: "result", label: "3D Analytics" },
    ];
    return (
      <div className="w-full max-w-lg mb-8 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex items-center justify-between shadow-sm select-none">
        {steps.map((s, idx) => {
          const isActive = s.key === currentPhase;
          const isCompleted =
            (currentPhase === "marking" && idx < 1) ||
            (currentPhase === "processing" && idx < 2) ||
            (currentPhase === "result" && idx < 3);
          return (
            <React.Fragment key={s.key}>
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                    isActive
                      ? "bg-[#191919] text-white border-[#191919] ring-4 ring-slate-900/10 scale-110"
                      : isCompleted
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-white text-slate-400 border-slate-200"
                  }`}
                >
                  {isCompleted ? "✓" : idx + 1}
                </span>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider text-center transition-colors ${
                    isActive
                      ? "text-[#191919]"
                      : isCompleted
                      ? "text-emerald-700"
                      : "text-slate-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`h-[1px] w-4 sm:w-8 transition-colors ${
                    isCompleted ? "bg-emerald-200" : "bg-slate-200"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // ── Processing phase render ──────────────────────────────────────────────

  const renderProcessing = () => {
    const stages = [
      { id: "upload", label: "Upload walkthrough and extract frames" },
      { id: "init_geo", label: "Initialize 3D camera geometry (MASt3R)" },
      { id: "train_gs", label: "Fast 3D-Gaussian Splat optimization" },
      { id: "extract_pc", label: "Extract high-density point cloud" },
      { id: "fit_dbh", label: "Fit trunk cylinder and compute carbon stock" },
      { id: "upload_res", label: "Upload 3D assets to cloud storage" },
    ];

    const currentMsg = pipelineStatus?.message || "";
    let activeStageIndex = 0;
    if (currentMsg.includes("Initializing geometry")) activeStageIndex = 1;
    else if (currentMsg.includes("Training Gaussians")) activeStageIndex = 2;
    else if (currentMsg.includes("Extracting point cloud")) activeStageIndex = 3;
    else if (currentMsg.includes("Computing DBH")) activeStageIndex = 4;
    else if (
      currentMsg.includes("Uploading results") ||
      currentMsg.includes("Saving scan results")
    )
      activeStageIndex = 5;

    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-6 animate-fadeIn">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              Active Pipeline
            </span>
            <h3 className="font-serif text-xl text-[#191919] font-normal mt-2 tracking-tight">
              {calibrationCode}
            </h3>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">
              Elapsed Time
            </span>
            <span
              className="text-4xl text-[#191919] tracking-wider leading-none"
              style={{ fontFamily: "var(--font-head)" }}
            >
              {formatElapsed(elapsedTime)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6">
          <div className="sm:col-span-5 flex flex-col gap-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
              Processing Asset
            </span>
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-900 shadow-inner flex items-center justify-center">
              <img
                src={`${BACKEND_URL}/frames/0000.jpg`}
                alt="Processing asset frame"
                className="w-full h-full object-cover opacity-75"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-md rounded-lg px-2 py-1 text-[10px] text-white font-medium border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live processing</span>
              </div>
            </div>
          </div>

          <div className="sm:col-span-7 flex flex-col gap-3">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
              Pipeline Stages
            </span>
            <div className="flex flex-col gap-3.5">
              {stages.map((st, idx) => {
                const isDone = idx < activeStageIndex;
                const isCurrent = idx === activeStageIndex;
                return (
                  <div key={st.id} className="flex items-center gap-3">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                        isDone
                          ? "bg-emerald-500 border-emerald-500 text-white text-[10px]"
                          : isCurrent
                          ? "bg-white border-[#191919] ring-2 ring-[#191919]/10 animate-pulse"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      {isDone ? (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : isCurrent ? (
                        <div className="w-2 h-2 border-2 border-[#191919] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      )}
                    </span>
                    <span
                      className={`text-xs transition-colors ${
                        isDone
                          ? "text-slate-400 line-through decoration-slate-300"
                          : isCurrent
                          ? "text-[#191919] font-bold"
                          : "text-slate-400"
                      }`}
                    >
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 flex items-center gap-3.5 mt-2">
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
            <svg
              className="w-4 h-4 text-slate-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-[10px] text-slate-500 leading-normal">
            Modal GPU cluster handles multi-view geometry alignment and Gaussian optimization.
            Please keep this browser window open until analysis completes.
          </p>
        </div>
      </div>
    );
  };

  // ── Phase 4 (Result) full-screen view ────────────────────────────────────

  if (phase === "result") {
    return (
      <div className="fixed inset-0 bg-white overflow-hidden font-sans text-[#191919]">

        {/* Full-screen 3D Viewer */}
        <div className="absolute inset-0 z-0 bg-white pt-[68px]">
          {currentScan ? (
            <iframe
              src={`${BACKEND_URL}/viewer.html?v=11&code=${currentScan.tree_code}&url=${encodeURIComponent(currentScan.splat_file_url)}`}
              allow="xr-spatial-tracking; autoplay; fullscreen"
              className="w-full h-full border-none"
              title="3D Tree Gaussian Splat Viewer"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-slate-50/50">
              {loading ? (
                <>
                  <UiverseLoader />
                  <p className="text-xs text-slate-400 font-medium animate-pulse">
                    Loading scan data…
                  </p>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-slate-400 font-medium tracking-wide mb-1">
                    No scan loaded
                  </p>
                  <p className="text-xs text-slate-300">
                    Open the details drawer to search a tree code
                  </p>
                </div>
              )}
            </div>
          )}
        </div>



        {/* Floating Sidebar Toggle */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              opacity: !currentScan || sceneLoaded ? 1 : 0,
              pointerEvents: !currentScan || sceneLoaded ? "auto" : "none",
              transition: "opacity 0.5s ease 0.1s",
            }}
            className="fixed top-[88px] right-6 z-35 p-3 bg-[#191919] text-white hover:bg-[#191919]/90 rounded-full transition-all duration-200 shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 animate-fadeIn"
            aria-label="Toggle Details Drawer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
        )}

        {/* Carbon metrics Command Dock */}
        {currentScan && (
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 max-w-4xl w-[92%] sm:w-auto flex flex-col gap-2"
            style={{
              opacity: sceneLoaded ? 1 : 0,
              transform: `translateX(-50%) translateY(${sceneLoaded ? 0 : 16}px)`,
              transition: "opacity 0.5s ease, transform 0.5s ease",
              pointerEvents: sceneLoaded ? "auto" : "none",
            }}
          >
            {currentScan.scale_status !== "calibrated" && (
              <div className="bg-red-600/95 backdrop-blur-sm border border-red-700 text-white text-[11px] sm:text-xs font-bold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 max-w-md sm:max-w-2xl animate-pulse">
                <svg className="w-5 h-5 text-white shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>
                  ⚠ HASIL BELUM DIKALIBRASI SKALA — angka DBH/karbon memakai unit PLY default dan
                  TIDAK DAPAT DIANDALKAN. Lakukan kalibrasi skala (calibrate_scale.py / auto-pose)
                  sebelum mempercayai hasil.
                </span>
              </div>
            )}

            {currentScan.quality_status === "low_points" && (
              <div className="bg-amber-50/95 backdrop-blur-sm border border-amber-200/60 text-amber-900 text-[10px] sm:text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 max-w-md sm:max-w-xl">
                <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Kualitas rendah: terlalu sedikit titik pada slice DBH. Hasil berisiko tidak akurat.</span>
              </div>
            )}

            {currentScan.height_used === "user_manual_height" && (
              <div className="bg-amber-50/95 backdrop-blur-sm border border-amber-200/60 text-amber-900 text-[10px] sm:text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 max-w-md sm:max-w-xl">
                <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>
                  Tinggi diinput manual oleh user — nilai TIDAK divalidasi otomatis terhadap point cloud
                  (sepenuhnya tanggung jawab input user).
                </span>
              </div>
            )}

            {currentScan.confidence_note?.includes("WARNING") && (
              <div className="bg-amber-50/95 backdrop-blur-sm border border-amber-200/60 text-amber-900 text-[10px] sm:text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 max-w-md sm:max-w-xl">
                <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{currentScan.confidence_note}</span>
              </div>
            )}

            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xl px-5 py-3 flex items-center justify-between sm:justify-start gap-4 sm:gap-6 divide-x divide-slate-100 overflow-x-auto">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">DBH</span>
                  {currentScan.confidence_note?.includes("WARNING") && (
                    <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <title>Warning: insufficient height</title>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                </div>
                <div className="flex items-baseline">
                  <span className="font-serif text-2xl text-[#191919] leading-none">{currentScan.dbh_cm?.toFixed(1) ?? "--"}</span>
                  <span className="text-[11px] text-slate-400 font-medium ml-1">cm</span>
                </div>
              </div>

              <div className="flex flex-col gap-0.5 pl-4 sm:pl-6">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Height</span>
                <div className="flex items-baseline">
                  <span className="font-serif text-2xl text-[#191919] leading-none">{currentScan.tinggi_m?.toFixed(1) ?? "--"}</span>
                  <span className="text-[11px] text-slate-400 font-medium ml-1">m</span>
                </div>
              </div>

              <div className="flex flex-col gap-0.5 pl-4 sm:pl-6">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Biomass</span>
                <div className="flex items-baseline">
                  <span className="font-serif text-2xl text-[#191919] leading-none">{currentScan.biomassa_kg?.toFixed(1) ?? "--"}</span>
                  <span className="text-[11px] text-slate-400 font-medium ml-1">kg</span>
                </div>
              </div>

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

              <div className="flex flex-col gap-0.5 pl-4 sm:pl-6">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">CO₂e</span>
                <div className="flex items-baseline">
                  <span className="font-serif text-2xl text-[#191919] leading-none">{currentScan.co2e_kg?.toFixed(1) ?? "--"}</span>
                  <span className="text-[11px] text-slate-400 font-medium ml-1">kg</span>
                </div>
              </div>
            </div>

            {/* Claim scan box for logged-in users */}
            {currentUser && (
              <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xl px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5 w-full sm:w-auto">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Status Plot & Klaim</span>
                  <div className="text-xs text-[#191919] font-medium mt-0.5">
                    {currentScan.claimed_by_user_id ? (
                      <span className="text-emerald-600 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        ✓ Terklaim ke Plot Anda
                      </span>
                    ) : (
                      <span>Belum diklaim ke plot mana pun</span>
                    )}
                  </div>
                </div>

                {!currentScan.claimed_by_user_id && userPlots.length > 0 && (
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <select
                      value={selectedPlotId}
                      onChange={(e) => setSelectedPlotId(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {userPlots.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.plot_code})
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleClaimScan}
                      disabled={claiming}
                      className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold text-xs rounded-xl px-4 py-2 transition-all cursor-pointer whitespace-nowrap"
                    >
                      {claiming ? "Mengklaim..." : "Klaim ke Plot"}
                    </button>
                  </div>
                )}

                {!currentScan.claimed_by_user_id && userPlots.length === 0 && (
                  <div className="text-xs text-slate-400 italic">
                    Belum memiliki plot.{" "}
                    <Link href="/plots/create" className="text-emerald-600 font-bold hover:underline">
                      Buat Plot Baru
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Prompt to log in for guest users */}
            {!currentUser && !currentScan.claimed_by_user_id && (
              <div className="bg-[#161920]/95 backdrop-blur-xl border border-slate-800 text-slate-300 text-xs rounded-2xl shadow-xl px-5 py-3 flex items-center justify-between gap-4">
                <span>Ingin menyimpan hasil scan ini ke plot Anda?</span>
                <Link href="/login?redirect=/reconstruct" className="text-emerald-400 font-bold hover:underline shrink-0">
                  Masuk Akun & Klaim
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Sidebar Intelligence Drawer — identical to original estimator */}
        <div
          className={`fixed top-0 right-0 bottom-0 z-40 w-80 sm:w-96 bg-white border-l border-slate-200/80 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out pt-[60px] sm:pt-[72px] ${
            sidebarOpen ? "translate-x-0" : "translate-x-full"
          }`}
          style={{
            opacity: !currentScan || sceneLoaded ? 1 : 0,
            pointerEvents: !currentScan || sceneLoaded ? "auto" : "none",
            transition: "opacity 0.5s ease 0.15s, transform 0.3s ease",
          }}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-white">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold tracking-wider text-[#191919] uppercase">
                  {activeTreeCode || "Search Tree"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                {history.length > 0
                  ? `${history.length} scan record${history.length !== 1 ? "s" : ""} found`
                  : "No active scan"}
              </p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-[#191919] flex items-center justify-center text-xs transition"
            >
              ✕
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* Search Form */}
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Search Tree Code
              </h3>
              <form onSubmit={handleSearch} className="flex items-center w-full">
                <div className="relative w-full flex items-center shadow-sm rounded-xl bg-slate-50 border border-slate-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#191919]/10 focus-within:border-[#191919] transition-all">
                  <input
                    type="text"
                    value={treeCode}
                    onChange={(e) => setTreeCode(e.target.value)}
                    placeholder="Enter code (e.g. POHON-6144)…"
                    className="w-full pl-9 pr-16 py-2.5 bg-transparent focus:outline-none text-xs font-semibold text-[#191919] placeholder:text-slate-400"
                  />
                  <svg className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {/* Species Classification */}
            {currentScan && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Species Classification
                  </h3>
                  <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    Pl@ntNet AI
                  </span>
                </div>

                {predictions && predictions.length > 0 ? (
                  <div className="space-y-3">
                    {predictions[0] && (
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-slate-50 border border-emerald-100 relative overflow-hidden">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 block mb-0.5">
                              Top Specimen Match
                            </span>
                            <h4 className="text-sm font-semibold text-[#191919] italic font-serif">
                              {predictions[0]?.scientific_name ?? "Unknown"}
                            </h4>
                            {predictions[0]?.common_name && (
                              <p className="text-xs text-slate-500 font-medium capitalize mt-0.5">
                                {predictions[0]?.common_name}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-emerald-700 font-serif">
                              {(predictions[0]?.confidence ?? 0).toFixed(1)}%
                            </span>
                            <span className="text-[9px] text-emerald-600/70 font-medium">Confidence</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden mt-3">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                            style={{ width: `${predictions[0]?.confidence ?? 0}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {predictions.length > 1 && (
                      <div className="space-y-2 pt-1">
                        <span className="text-[10px] font-medium text-slate-400 block px-1">
                          Other Probable Candidates
                        </span>
                        <div className="divide-y divide-slate-100">
                          {predictions.slice(1).map((pred, idx) => (
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
                                {(pred.confidence ?? 0).toFixed(1)}%
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

            {/* How This Was Calculated */}
            {currentScan && (
              <div className="border border-slate-200/80 rounded-2xl bg-slate-50/40 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                <button
                  onClick={() => setCalcOpen(!calcOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100/80 text-left transition-all duration-200"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 11h.01M12 7h.01M15 11h.01M15 7h.01M12 14h.01M9 11h.01M18 20V4a1 1 0 00-1-1H7a1 1 0 00-1 1v16a1 1 0 001 1h10a1 1 0 001-1z" />
                    </svg>
                    How this was calculated
                  </span>
                  <span className="text-slate-400 text-[10px] font-bold">{calcOpen ? "▲" : "▼"}</span>
                </button>

                {calcOpen && (
                  <div className="px-4 pb-4 pt-3 text-xs space-y-3.5 border-t border-slate-200/50 bg-white font-sans divide-y divide-slate-100">
                    <div className="space-y-1.5">
                      <p className="font-semibold text-slate-700 uppercase text-[9px] tracking-wide">1. Input Tree Dimensions</p>
                      <div className="grid grid-cols-2 gap-2 text-slate-600 font-medium">
                        <div>Diameter (DBH): <span className="font-semibold text-[#191919]">{currentScan.dbh_cm?.toFixed(1) ?? "-"} cm</span></div>
                        <div>Tree Height: <span className="font-semibold text-[#191919]">{currentScan.tinggi_m?.toFixed(1) ?? "-"} m</span></div>
                      </div>
                    </div>

                    <div className="pt-3 space-y-1.5">
                      <p className="font-semibold text-slate-700 uppercase text-[9px] tracking-wide">2. Wood Density Match</p>
                      <div className="space-y-1 text-slate-600 font-medium">
                        <div>Species Matched: <span className="font-semibold text-[#191919] italic">
                          {predictions?.[0]
                            ? `${predictions[0].scientific_name ?? "Unknown"} (${(predictions[0].confidence ?? 0).toFixed(1)}%)`
                            : "None (Generic Fallback)"}
                        </span></div>
                        <div>Wood Density (ρ): <span className="font-semibold text-[#191919]">{currentScan.wood_density_used?.toFixed(2) ?? "0.60"} g/cm³</span></div>
                        <div>Source: <span className="font-semibold text-[#191919] capitalize">{currentScan.wood_density_source?.replace("-", " ") ?? "generic default"}</span></div>
                      </div>
                    </div>

                    <div className="pt-3 space-y-1.5">
                      <p className="font-semibold text-slate-700 uppercase text-[9px] tracking-wide">3. Climate & Allometric Formula</p>
                      <div className="space-y-1 text-slate-600 font-medium">
                        <div>GPS Coordinates: <span className="font-semibold text-[#191919]">
                          {currentScan.gps_lat != null && currentScan.gps_lon != null
                            ? `${currentScan.gps_lat.toFixed(4)}, ${currentScan.gps_lon.toFixed(4)}`
                            : "Not Available"}
                        </span></div>
                        <div>Climate Zone (Köppen): <span className="font-semibold text-[#191919]">{currentScan.climate_zone_detected ?? "Unknown"}</span></div>
                        <div>Formula Used: <span className="font-semibold text-emerald-800">{currentScan.formula_used ?? "Chave 2005 (moist)"}</span></div>
                        <div>Height Usage: <span className="font-semibold text-[#191919]">
                          {currentScan.height_used === "full_height"
                            ? `Full tree height (${currentScan.total_height_used_m?.toFixed(1) ?? "-"} m)`
                            : currentScan.height_used === "user_manual_height"
                              ? `Manual height input (${currentScan.total_height_used_m?.toFixed(1) ?? "-"} m)`
                              : "DBH-only (tinggi tidak dipakai)"}
                        </span></div>
                        {currentScan.height_validated === false && currentScan.height_validation_reason && (
                          <div className="text-[10px] text-amber-700/80">Catatan validasi: {currentScan.height_validation_reason}</div>
                        )}
                        {currentScan.height_used === "dbh_only_fallback" && currentScan.height_fallback_reason && (
                          <div className="text-[10px] text-amber-700/80">Alasan: {currentScan.height_fallback_reason}</div>
                        )}
                        <div>Root-to-Shoot Ratio: <span className="font-semibold text-[#191919]">{currentScan.root_to_shoot_ratio?.toFixed(2) ?? "0.37"}</span></div>
                        <div>Scale Status: <span className={`font-semibold ${currentScan.scale_status === "calibrated" ? "text-emerald-700" : "text-red-600"}`}>{currentScan.scale_status === "calibrated" ? "Calibrated" : "Uncalibrated"}</span>{currentScan.scale_factor_used != null && currentScan.scale_factor_used !== 1.0 ? ` (×${currentScan.scale_factor_used?.toFixed(4)})` : ""}</div>
                      </div>
                    </div>

                    <div className="pt-3 space-y-2">
                      <p className="font-semibold text-slate-700 uppercase text-[9px] tracking-wide">4. Calculation Steps</p>
                      <div className="space-y-1.5 text-slate-600 font-medium font-sans">
                        <div className="flex justify-between">
                          <span>Above-Ground Biomass (AGB):</span>
                          <span className="font-semibold text-[#191919]">{currentScan.agb_kg?.toFixed(1) ?? "-"} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Below-Ground Biomass (BGB):</span>
                          <span className="font-semibold text-[#191919]">{currentScan.bgb_kg?.toFixed(1) ?? "-"} kg <span className="text-[10px] text-slate-400 font-normal">(AGB × {currentScan.root_to_shoot_ratio?.toFixed(2) ?? "0.37"})</span></span>
                        </div>
                        <div className="flex justify-between border-t border-dashed border-slate-100 pt-1.5 font-bold">
                          <span className="text-[#191919]">Total Dry Biomass:</span>
                          <span className="text-[#191919]">{currentScan.biomassa_kg?.toFixed(1) ?? "-"} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Stored Carbon Stock:</span>
                          <span className="font-semibold text-emerald-800">{currentScan.karbon_kg?.toFixed(1) ?? "-"} kg <span className="text-[10px] text-emerald-600/70 font-normal">(Biomass × 0.47)</span></span>
                        </div>
                        <div className="flex justify-between border-t border-slate-100 pt-1.5 font-bold text-emerald-950">
                          <span>CO₂ Equivalent (CO₂e):</span>
                          <span>{currentScan.co2e_kg?.toFixed(1) ?? "-"} kg <span className="text-[10px] text-slate-400 font-normal">(Carbon × 3.67)</span></span>
                        </div>
                        {currentScan.co2e_low_kg != null && currentScan.co2e_high_kg != null && (
                          <div className="text-[10px] text-slate-400">
                            Rentang ±{currentScan.co2e_uncertainty_pct?.toFixed(0) ?? "10"}%: {currentScan.co2e_low_kg.toFixed(1)} – {currentScan.co2e_high_kg.toFixed(1)} kg
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3D manual alignment and recalibration controls */}
            {currentScan && (
              <div className="flex flex-col gap-2 mt-2">
                {isEditing3D ? (
                  <>
                    <button
                      onClick={() => {
                        const iframe = document.querySelector("iframe");
                        if (iframe && iframe.contentWindow) {
                          iframe.contentWindow.postMessage({ type: "save_3d_edit" }, "*");
                        }
                      }}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition shadow-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Save 3D Alignment
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing3D(false);
                        const iframe = document.querySelector("iframe");
                        if (iframe && iframe.contentWindow) {
                          iframe.contentWindow.postMessage({ type: "cancel_3d_edit" }, "*");
                        }
                      }}
                      className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2"
                    >
                      Cancel Edit
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setClickedPoints([]);
                        setRecalibError(null);
                        setMousePos(null);
                        setRecalibModalOpen(true);
                      }}
                      className="w-full py-3 bg-[#191919] hover:bg-[#191919]/90 text-white text-xs font-semibold rounded-xl transition shadow-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.24 11.54a3 3 0 00-4.24-4.24m0 0a3 3 0 00-4.24 4.24m4.24-4.24V3m0 0L8 5.5M11 3l3 2.5M3 12h18m-3 0a3 3 0 01-3 3H9a3 3 0 01-3-3" />
                      </svg>
                      Recalibrate Trunk (2D Photo)
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing3D(true);
                        const iframe = document.querySelector("iframe");
                        if (iframe && iframe.contentWindow) {
                          iframe.contentWindow.postMessage({ type: "start_3d_edit" }, "*");
                        }
                      }}
                      className="w-full py-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit 3D Alignment (Manual)
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Scan History Timeline */}
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
                              <span className="text-xs font-semibold uppercase tracking-tight">
                                {record.tree_code}
                              </span>
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

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={() => {
                transitionPhase("upload");
                setSubmittedCode(null);
                setError(null);
                setProgressMsg("");
                setVideoFile(null);
                setPhotoFiles(null);
                setTreeCode("");
                setCurrentScan(null);
                setHistory([]);
                setActiveTreeCode("");
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#191919] text-white text-xs font-medium rounded-xl hover:bg-[#191919]/90 transition-all shadow-sm"
            >
              <span>+ Upload New Scan</span>
            </button>
          </div>
        </div>

        {/* Error toast */}
        {error && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#191919] text-[#ffffff] text-xs px-5 py-3 rounded-xl shadow-lg">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="opacity-50 hover:opacity-100 transition">✕</button>
          </div>
        )}

        {/* 2D Recalibration Modal */}
        {recalibModalOpen && currentScan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-serif text-xl text-[#191919] font-normal">Recalibrate Trunk Axis</h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium">Click two points on the 2D image to set the trunk direction.</p>
                </div>
                <button
                  onClick={() => { setRecalibModalOpen(false); setClickedPoints([]); }}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-[#191919] flex items-center justify-center text-xs transition"
                >
                  ✕
                </button>
              </div>

              {recalibError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-medium">
                  {recalibError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-6">
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    {clickedPoints.length === 0 && "Step 1: Click the BASE of the trunk"}
                    {clickedPoints.length === 1 && "Step 2: Click the TOP/UPPER part of the trunk"}
                    {clickedPoints.length >= 2 && "Step 3: Ready to Recalibrate"}
                  </div>

                  <div
                    className="relative border border-slate-200 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center select-none"
                    style={{ maxHeight: "50vh" }}
                  >
                    <img
                      src={currentScan.thumbnail_url}
                      alt="Representative Scan Frame"
                      onLoad={handleImageLoad}
                      onClick={(e) => {
                        if (clickedPoints.length >= 2) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        setClickedPoints([...clickedPoints, {
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                          dispWidth: rect.width,
                          dispHeight: rect.height,
                        }]);
                      }}
                      onMouseMove={(e) => {
                        if (clickedPoints.length !== 1) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                      }}
                      className="max-h-[50vh] object-contain cursor-crosshair max-w-full"
                    />

                    <svg className="absolute inset-0 pointer-events-none w-full h-full">
                      {clickedPoints.map((pt, idx) => (
                        <circle key={idx} cx={pt.x} cy={pt.y} r="6" fill={idx === 0 ? "#10b981" : "#0284c7"} stroke="white" strokeWidth="2" />
                      ))}
                      {clickedPoints.map((pt, idx) => (
                        <text key={`lbl-${idx}`} x={pt.x + 10} y={pt.y + 4} fill="white" fontSize="10" fontWeight="bold" style={{ textShadow: "1px 1px 2px black" }}>
                          {idx === 0 ? "1: Base" : "2: Top"}
                        </text>
                      ))}
                      {clickedPoints.length === 2 && (
                        <line x1={clickedPoints[0].x} y1={clickedPoints[0].y} x2={clickedPoints[1].x} y2={clickedPoints[1].y} stroke="#10b981" strokeWidth="3" strokeDasharray="4 4" />
                      )}
                      {clickedPoints.length === 1 && mousePos && (
                        <line x1={clickedPoints[0].x} y1={clickedPoints[0].y} x2={mousePos.x} y2={mousePos.y} stroke="#a855f7" strokeWidth="2" strokeDasharray="4 4" opacity="0.7" />
                      )}
                    </svg>
                  </div>
                </div>

                {/* VISUAL GUIDE CARD */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-3 h-fit">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Trunk Click Guide</h4>
                  <div className="flex justify-center py-2 bg-white rounded-xl border border-slate-100">
                    <svg width="120" height="150" viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
                      {/* Ground */}
                      <path d="M10 135C40 135 80 135 110 135" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round"/>
                      
                      {/* Root Flare (Incorrect zone) */}
                      <path d="M40 90C40 110 30 130 15 135C45 135 50 120 60 120C70 120 75 135 105 135C90 130 80 110 80 90Z" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />
                      
                      {/* Trunk (Straight cylinder) */}
                      <rect x="45" y="30" width="30" height="70" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
                      
                      {/* Leaves / Canopy */}
                      <circle cx="60" cy="25" r="20" fill="#def7ec" stroke="#bcefdb" strokeWidth="1.5" />
                      <circle cx="45" cy="20" r="15" fill="#def7ec" stroke="#bcefdb" strokeWidth="1.5" />
                      <circle cx="75" cy="20" r="15" fill="#def7ec" stroke="#bcefdb" strokeWidth="1.5" />

                      {/* Dotted Axis Line */}
                      <line x1="60" y1="90" x2="60" y2="40" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" />

                      {/* Correct clicks */}
                      {/* Pt 2 (Top) */}
                      <circle cx="60" cy="45" r="5" fill="#0284c7" stroke="white" strokeWidth="1.5" />
                      <text x="70" y="48" fill="#0284c7" fontSize="9" fontWeight="bold">Pt 2 (Top)</text>
                      
                      {/* Pt 1 (Base) */}
                      <circle cx="60" cy="85" r="5" fill="#10b981" stroke="white" strokeWidth="1.5" />
                      <text x="70" y="88" fill="#10b981" fontSize="9" fontWeight="bold">Pt 1 (Base)</text>

                      {/* Too Low Warning Zone */}
                      <circle cx="60" cy="120" r="6" fill="#ef4444" />
                      <line x1="57" y1="117" x2="63" y2="123" stroke="white" strokeWidth="1.5" />
                      <line x1="63" y1="117" x2="57" y2="123" stroke="white" strokeWidth="1.5" />
                      <text x="12" y="112" fill="#ef4444" fontSize="8" fontWeight="bold">Too Low (Root Flare)</text>
                      <path d="M50 115C35 115 30 115 25 115" stroke="#ef4444" strokeWidth="1" strokeDasharray="2 2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <ul className="text-[11px] text-slate-500 space-y-2 leading-normal">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold shrink-0">✓</span>
                      <span><b>Point 1 (Base):</b> Click where the trunk becomes a straight cylinder, slightly <b>above the ground & root flares</b>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold shrink-0">✓</span>
                      <span><b>Point 2 (Top):</b> Click higher up on the straight trunk center line.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 font-bold shrink-0">✗</span>
                      <span className="text-red-600/80"><b>Avoid:</b> Clicking the flared root buttress at the absolute bottom.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => { setClickedPoints([]); setMousePos(null); setRecalibError(null); }}
                  disabled={clickedPoints.length === 0 || recalibLoading}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#191919] text-xs font-semibold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Reset Points
                </button>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setRecalibModalOpen(false); setClickedPoints([]); }}
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

  // ── Phase 1, 2, 3 — Scrollable form layout ──────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans text-[#191919]">


      <main className="flex-1 flex flex-col items-center justify-center pt-28 pb-20 px-4">

        {/* Stepper */}
        <Stepper currentPhase={phase} />

        <div className={`w-full transition-all duration-300 ${phase === "marking" ? "max-w-3xl" : "max-w-lg"}`}>

          {/* ── Phase 1: Upload ── */}
          {phase === "upload" && (
            <>
              <div className="mb-8">
                <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight mb-2">
                  New reconstruction
                </h1>
                <p className="text-xs text-[#191919]/50 leading-relaxed font-medium">
                  Upload a video walkthrough or photo set to start the 3D pipeline.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
                <div className="flex gap-1 mb-7 bg-slate-100 rounded-xl p-1">
                  {(["video", "photos"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => { setActiveTab(tab); setError(null); }}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                        activeTab === tab
                          ? "bg-white text-[#191919] shadow-sm border border-slate-200"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {tab === "video" ? "Video" : "Photos"}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Tree identifier <span className="normal-case tracking-normal font-normal text-slate-300">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={treeCode}
                      onChange={(e) => setTreeCode(e.target.value)}
                      placeholder="e.g. POHON-0042"
                      className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-slate-400 text-sm font-medium transition"
                      disabled={loading}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Latitude <span className="normal-case tracking-normal font-normal text-slate-300">(optional)</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        placeholder="e.g. -6.2000"
                        className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-slate-400 text-sm font-medium transition"
                        disabled={loading}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Longitude <span className="normal-case tracking-normal font-normal text-slate-300">(optional)</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        placeholder="e.g. 106.8000"
                        className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-slate-400 text-sm font-medium transition"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {activeTab === "video" && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Video file</label>
                        <div className="relative border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-2xl p-8 text-center cursor-pointer transition">
                          <input
                            type="file"
                            accept=".mp4,.mov,.avi,.webm,.mkv"
                            onChange={handleVideoChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={loading}
                          />
                          <p className="text-sm font-medium text-slate-600">
                            {videoFile ? videoFile.name : "Click or drag to upload"}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">MP4, MOV, AVI walkthrough — up to 4 GB</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <span>Frames</span><span className="text-[#191919]">{frames}</span>
                          </div>
                          <input type="range" min="10" max="100" step="5" value={frames}
                            onChange={(e) => setFrames(+e.target.value)}
                            className="w-full accent-slate-900" disabled={loading} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <span>Blur filter</span><span className="text-[#191919]">{blurThresh}</span>
                          </div>
                          <input type="range" min="10" max="200" step="10" value={blurThresh}
                            onChange={(e) => setBlurThresh(+e.target.value)}
                            className="w-full accent-slate-900" disabled={loading} />
                        </div>
                      </div>
                    </>
                  )}

                  {activeTab === "photos" && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Photo files</label>
                      <div className="relative border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-2xl p-8 text-center cursor-pointer transition">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handlePhotosChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={loading}
                        />
                        <p className="text-sm font-medium text-slate-600">
                          {photoFiles ? `${photoFiles.length} photos selected` : "Click or drag to upload"}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Select multiple images covering all angles</p>
                      </div>
                    </div>
                  )}

                  {loading && (
                    <div className="flex flex-col gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin shrink-0" />
                        <p className="text-xs text-slate-600">{progressMsg}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg border border-red-100 transition"
                      >
                        Cancel Reconstruction
                      </button>
                    </div>
                  )}

                  {error && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#191919] hover:bg-[#191919]/90 text-white text-sm font-semibold rounded-xl transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed mt-1"
                  >
                    {loading ? "Processing Upload..." : "Upload & Reconstruct"}
                  </button>
                </form>
              </div>
            </>
          )}

          {/* ── Phase 2: Trunk Marking ── */}
          {phase === "marking" && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-6 animate-fadeIn">
              <div>
                <h3 className="font-serif text-xl text-[#191919] font-normal">Mark Trunk Axis (Recommended)</h3>
                <p className="text-xs text-slate-400 mt-1.5 font-medium leading-relaxed">
                  Click two points on the extracted first frame image:<br />
                  1. The <b>BASE/ROOT</b> of the trunk (Green marker).<br />
                  2. The <b>TOP/UPPER</b> part of the trunk (Blue marker).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-6">
                <div className="flex flex-col gap-2">
                  <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">
                    {calibrationPoints.length === 0 && "Step 1: Click the BASE of the trunk"}
                    {calibrationPoints.length === 1 && "Step 2: Click the TOP/UPPER part of the trunk"}
                    {calibrationPoints.length >= 2 && "Step 3: Ready to Reconstruct"}
                  </div>

                  <div className="relative border border-slate-200 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center select-none" style={{ maxHeight: "40vh" }}>
                    <img
                      src={`${BACKEND_URL}/frames/0000.jpg?t=${Date.now()}`}
                      alt="Extracted Frame"
                      onLoad={(e) => {
                        setCalibrationImgSize({
                          width: e.currentTarget.naturalWidth,
                          height: e.currentTarget.naturalHeight,
                        });
                      }}
                      onClick={(e) => {
                        if (calibrationPoints.length >= 2) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        setCalibrationPoints([...calibrationPoints, {
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                          dispWidth: rect.width,
                          dispHeight: rect.height,
                        }]);
                      }}
                      onMouseMove={(e) => {
                        if (calibrationPoints.length !== 1) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        setCalibrationMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                      }}
                      className="max-h-[40vh] object-contain cursor-crosshair max-w-full"
                    />
                    <svg className="absolute inset-0 pointer-events-none w-full h-full">
                      {calibrationPoints.map((pt, idx) => (
                        <circle key={idx} cx={pt.x} cy={pt.y} r="6" fill={idx === 0 ? "#10b981" : "#0284c7"} stroke="white" strokeWidth="2" />
                      ))}
                      {calibrationPoints.map((pt, idx) => (
                        <text key={`lbl-${idx}`} x={pt.x + 10} y={pt.y + 4} fill="white" fontSize="10" fontWeight="bold" style={{ textShadow: "1px 1px 2px black" }}>
                          {idx === 0 ? "1: Base" : "2: Top"}
                        </text>
                      ))}
                      {calibrationPoints.length === 2 && (
                        <line x1={calibrationPoints[0].x} y1={calibrationPoints[0].y} x2={calibrationPoints[1].x} y2={calibrationPoints[1].y} stroke="#10b981" strokeWidth="3" strokeDasharray="4 4" />
                      )}
                      {calibrationPoints.length === 1 && calibrationMousePos && (
                        <line x1={calibrationPoints[0].x} y1={calibrationPoints[0].y} x2={calibrationMousePos.x} y2={calibrationMousePos.y} stroke="#a855f7" strokeWidth="2" strokeDasharray="4 4" opacity="0.7" />
                      )}
                    </svg>
                  </div>
                </div>

                {/* VISUAL GUIDE CARD */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-3 h-fit">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Trunk Click Guide</h4>
                  <div className="flex justify-center py-2 bg-white rounded-xl border border-slate-100">
                    <svg width="120" height="150" viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
                      {/* Ground */}
                      <path d="M10 135C40 135 80 135 110 135" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round"/>
                      
                      {/* Root Flare (Incorrect zone) */}
                      <path d="M40 90C40 110 30 130 15 135C45 135 50 120 60 120C70 120 75 135 105 135C90 130 80 110 80 90Z" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />
                      
                      {/* Trunk (Straight cylinder) */}
                      <rect x="45" y="30" width="30" height="70" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
                      
                      {/* Leaves / Canopy */}
                      <circle cx="60" cy="25" r="20" fill="#def7ec" stroke="#bcefdb" strokeWidth="1.5" />
                      <circle cx="45" cy="20" r="15" fill="#def7ec" stroke="#bcefdb" strokeWidth="1.5" />
                      <circle cx="75" cy="20" r="15" fill="#def7ec" stroke="#bcefdb" strokeWidth="1.5" />

                      {/* Dotted Axis Line */}
                      <line x1="60" y1="90" x2="60" y2="40" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" />

                      {/* Correct clicks */}
                      {/* Pt 2 (Top) */}
                      <circle cx="60" cy="45" r="5" fill="#0284c7" stroke="white" strokeWidth="1.5" />
                      <text x="70" y="48" fill="#0284c7" fontSize="9" fontWeight="bold">Pt 2 (Top)</text>
                      
                      {/* Pt 1 (Base) */}
                      <circle cx="60" cy="85" r="5" fill="#10b981" stroke="white" strokeWidth="1.5" />
                      <text x="70" y="88" fill="#10b981" fontSize="9" fontWeight="bold">Pt 1 (Base)</text>

                      {/* Too Low Warning Zone */}
                      <circle cx="60" cy="120" r="6" fill="#ef4444" />
                      <line x1="57" y1="117" x2="63" y2="123" stroke="white" strokeWidth="1.5" />
                      <line x1="63" y1="117" x2="57" y2="123" stroke="white" strokeWidth="1.5" />
                      <text x="12" y="112" fill="#ef4444" fontSize="8" fontWeight="bold">Too Low (Root Flare)</text>
                      <path d="M50 115C35 115 30 115 25 115" stroke="#ef4444" strokeWidth="1" strokeDasharray="2 2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <ul className="text-[11px] text-slate-500 space-y-2 leading-normal">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold shrink-0">✓</span>
                      <span><b>Point 1 (Base):</b> Click where the trunk becomes a straight cylinder, slightly <b>above the ground & root flares</b>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold shrink-0">✓</span>
                      <span><b>Point 2 (Top):</b> Click higher up on the straight trunk center line.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 font-bold shrink-0">✗</span>
                      <span className="text-red-600/80"><b>Avoid:</b> Clicking the flared root buttress at the absolute bottom.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 mt-2">
                <div className="flex justify-between items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setCalibrationPoints([]); setCalibrationMousePos(null); }}
                    disabled={calibrationPoints.length === 0}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#191919] text-xs font-semibold rounded-xl transition"
                  >
                    Reset Points
                  </button>
                  <button
                    type="button"
                    onClick={handleSkipAndAutoReconstruct}
                    disabled={loading}
                    className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition disabled:opacity-40"
                  >
                    {loading ? "Starting…" : "Skip & Auto-detect"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleManualReconstruct}
                  disabled={calibrationPoints.length < 2 || loading}
                  className="w-full py-3 bg-[#191919] hover:bg-[#191919]/90 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Starting…
                    </>
                  ) : (
                    "Use Manual Selection & Reconstruct"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Phase 3: Processing ── */}
          {phase === "processing" && renderProcessing()}

        </div>
      </main>
    </div>
  );
}
