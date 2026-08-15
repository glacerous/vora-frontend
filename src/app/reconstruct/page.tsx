"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Loader from "@/components/Loader";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useScanProgress } from "@/components/ScanProgressProvider";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";

// ── Shared sub-components ───────────────────────────────────────────────────

const UiverseLoader = () => <Loader size={54} />;

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
    <div className="w-full max-w-lg mb-8 bg-[#fafaf9] border border-[#e7e5e4] rounded-2xl p-4 flex items-center justify-between shadow-sm select-none">
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
                    ? "bg-[#292524] text-white border-[#292524] ring-4 ring-[#1c1917]/10 scale-110"
                    : isCompleted
                    ? "bg-[#616c39]/10 text-[#616c39] border-[#616c39]/20"
                    : "bg-white text-[#79716b] border-[#e7e5e4]"
                }`}
              >
                {isCompleted ? "✓" : idx + 1}
              </span>
              <span
                className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-center transition-colors ${
                  isActive
                    ? "text-[#292524]"
                    : isCompleted
                    ? "text-[#616c39]"
                    : "text-[#79716b]"
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-[1px] w-2 sm:w-8 transition-colors ${
                  isCompleted ? "bg-[#616c39]/30" : "bg-[#e7e5e4]"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Main Page Component ─────────────────────────────────────────────────────

function ReconstructContent() {
  const router = useRouter();
  const { startTrackingScan, resetScan: resetGlobalScan } = useScanProgress();
  const [frameLoadError, setFrameLoadError] = useState(false);
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("code");
  const phaseParam = searchParams.get("phase") as typeof phase | null;

  // Phase management
  const [phase, setPhase] = useState<"upload" | "marking" | "processing" | "result">("upload");
  const [frameTimestamp, setFrameTimestamp] = useState<number>(0);

  // Keep a stable timestamp for frames when entering marking phase to prevent impure Date.now() calls during render
  useEffect(() => {
    if (phase === "marking") {
      setFrameTimestamp(Date.now());
    }
  }, [phase]);

  // Upload form states
  const [treeCode, setTreeCode] = useState("");
  const [frames, setFrames] = useState(60);
  const [blurThresh, setBlurThresh] = useState(80);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [removeBackground, setRemoveBackground] = useState(false);

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
  // Counts consecutive polls where server is idle but DB has no result yet
  const idlePollCountRef = useRef(0);

  // Result (Phase 4) states — mirrors original estimator/page.tsx exactly
  const [activeTreeCode, setActiveTreeCode] = useState("");
  const [currentScan, setCurrentScan] = useState<ScanRecord | null>(null);
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [renderViewer, setRenderViewer] = useState(false);

  useEffect(() => {
    if (phase === "result") {
      const timer = setTimeout(() => {
        setRenderViewer(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setRenderViewer(false);
    }
  }, [phase]);

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
        console.error("Failed to fetch user plots:", err);
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
  const [recalibImgLoading, setRecalibImgLoading] = useState(true);
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

  // ── Reactive URL parameter synchronization ────────────────────────────────

  useEffect(() => {
    if (codeParam) {
      setActiveTreeCode(codeParam);
      if (phaseParam === "processing") {
        // Resume polling — user refreshed during processing
        setCalibrationCode(codeParam);
        setPhase("processing");
      } else if (phaseParam === "marking") {
        setCalibrationCode(codeParam);
        setPhase("marking");
      } else {
        // Result view — direct load or ?phase=result
        setPhase("result");
        const isAlreadyLoaded = activeTreeCode === codeParam && currentScan && currentScan.tree_code === codeParam;
        if (!isAlreadyLoaded && !loading) {
          fetchTreeHistory(codeParam);
        }
      }
    } else {
      // No code in URL: Reset all state back to initial upload phase (e.g. user clicked "New Scan")
      setPhase("upload");
      setSubmittedCode(null);
      setError(null);
      setProgressMsg("");
      setVideoFile(null);
      setTreeCode("");
      setCurrentScan(null);
      setHistory([]);
      setActiveTreeCode("");
    }
  }, [codeParam, phaseParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Phase 3 polling ──────────────────────────────────────────────────────

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (phase === "processing") {
      idlePollCountRef.current = 0;
      const poll = async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/status/${encodeURIComponent(calibrationCode)}`);
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
            } else if (data.stage === "error" && data.tree_code === calibrationCode) {
              setError(data.error || "Reconstruction failed");
              transitionPhase("upload");
              setLoading(false);
            } else if (data.stage === "idle" || (data.tree_code && data.tree_code !== calibrationCode)) {
              // Bug fix: Check if DB already has a completed record (Modal finished
              // while Render was restarting so fn.remote() never returned).
              try {
                const historyRes = await fetch(`${BACKEND_URL}/history/${calibrationCode}`);
                if (historyRes.ok) {
                  const historyData = await historyRes.json();
                  if (historyData.success && historyData.history && historyData.history.length > 0) {
                    const latestScan = historyData.history[0];
                    if (latestScan.scan_date) {
                      idlePollCountRef.current = 0;
                      const code = calibrationCode;
                      setPhase("result");
                      setActiveTreeCode(code);
                      syncUrl("result", code);
                      setHistory(historyData.history);
                      setCurrentScan(latestScan);
                      setSidebarOpen(true);
                      setError(null);
                      return;
                    }
                  }
                }
              } catch (historyErr) {
                console.error("Error checking scan history during fallback:", historyErr);
              }
              // DB is still empty — the Modal job is still running (server restarted
              // mid-job). Count idle polls; after ~2 minutes without a result, show
              // an error and let the user retry rather than spinning forever.
              idlePollCountRef.current += 1;
              if (idlePollCountRef.current >= 40) {
                // ~2 min of idle with no DB result → the job likely failed
                idlePollCountRef.current = 0;
                setError(
                  "The server restarted during processing and did not recover within 2 minutes. " +
                  "If the job completed, it will appear in the Gallery. Otherwise, please retry."
                );
                transitionPhase("upload");
              }
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
      if (timerRef.current) clearInterval(timerRef.current);
      
      const updateTimer = () => {
        if (pipelineStatus?.started_at) {
          const serverStartMs = pipelineStatus.started_at * 1000;
          const diffSeconds = Math.max(0, Math.floor((Date.now() - serverStartMs) / 1000));
          setElapsedTime(diffSeconds);
        }
      };
      
      updateTimer();
      timerRef.current = setInterval(() => {
        if (pipelineStatus?.started_at) {
          updateTimer();
        } else {
          setElapsedTime((prev) => prev + 1);
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, pipelineStatus?.started_at]);

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
        throw new Error(data.detail || "Failed to claim scan");
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
      setClaimError(err.message || "Failed to claim scan");
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

      let frame_idx: number | undefined = undefined;
      if (currentScan.thumbnail_url) {
        const match = currentScan.thumbnail_url.match(/_(\d+)\.(jpg|jpeg|png)$/i);
        if (match) {
          frame_idx = parseInt(match[1], 10);
        }
      }

      const res = await fetch(`${BACKEND_URL}/scan/${currentScan.id}/recalculate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p1: p1_org, p2: p2_org, width: W_org, height: H_org, frame_idx }),
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
      const file = e.target.files[0];
      setError(null);

      // 1. File size check (<150MB)
      if (file.size > 150 * 1024 * 1024) {
        setError(`Video exceeds 150MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB). Please record a shorter 15–30s clip or compress the video.`);
        setVideoFile(null);
        return;
      }

      // 2. Video duration & decoding pre-check
      try {
        const videoEl = document.createElement("video");
        videoEl.preload = "metadata";
        const objUrl = URL.createObjectURL(file);
        videoEl.src = objUrl;

        videoEl.onloadedmetadata = () => {
          URL.revokeObjectURL(objUrl);
          const dur = videoEl.duration;
          if (dur > 60) {
            setError(`Video duration is ${Math.round(dur)}s (max 60s allowed). Please record a 15–30s orbit.`);
            setVideoFile(null);
          } else if (dur <= 0 || isNaN(dur)) {
            setError("Unable to read video duration. The video file may be blank or corrupted.");
            setVideoFile(null);
          } else {
            setVideoFile(file);
            setError(null);
          }
        };

        videoEl.onerror = () => {
          URL.revokeObjectURL(objUrl);
          setError("Failed to decode video. Please ensure the file is a standard MP4 or MOV video.");
          setVideoFile(null);
        };
      } catch {
        setVideoFile(file);
      }
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
    height: number | null,
    frame_idx: number | null = null
  ) => {
    try {
      const r = await fetch(`${BACKEND_URL}/reconstruct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tree_code: code,
          remove_background: removeBackground,
          gps_lat: null,
          gps_lon: null,
          p1,
          p2,
          width,
          height,
          frame_idx: frame_idx !== null ? frame_idx : (p1 ? 0 : null),
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
      startTrackingScan(finalCode, "reconstructing");
      transitionPhase("processing", finalCode);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  const handleSkipAndAutoReconstruct = async () => {
    setError(null);
    setLoading(true);
    setProgressMsg("Starting GPU reconstruction (Auto-detect)…");
    await startReconstructPayload(calibrationCode, null, null, null, null, null);
  };

  const handleManualReconstruct = async () => {
    if (calibrationPoints.length < 2) return;
    setError(null);
    setLoading(true);
    setProgressMsg("Starting GPU reconstruction (Manual axis)…");

    let W_org = calibrationImgSize?.width;
    let H_org = calibrationImgSize?.height;
    if (!W_org || !H_org) {
      const imgEl = document.querySelector('img[alt="Extracted Frame"]') as HTMLImageElement | null;
      if (imgEl && imgEl.naturalWidth && imgEl.naturalHeight) {
        W_org = imgEl.naturalWidth;
        H_org = imgEl.naturalHeight;
      } else {
        W_org = calibrationPoints[0]?.dispWidth || 1920;
        H_org = calibrationPoints[0]?.dispHeight || 1080;
      }
    }

    const p1_org = [
      (calibrationPoints[0].x / (calibrationPoints[0].dispWidth || 1)) * W_org,
      (calibrationPoints[0].y / (calibrationPoints[0].dispHeight || 1)) * H_org,
    ];
    const p2_org = [
      (calibrationPoints[1].x / (calibrationPoints[1].dispWidth || 1)) * W_org,
      (calibrationPoints[1].y / (calibrationPoints[1].dispHeight || 1)) * H_org,
    ];

    await startReconstructPayload(calibrationCode, p1_org, p2_org, W_org, H_org, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    isCancelledRef.current = false;
    setError(null);
    setSubmittedCode(null);
    const selectedCode =
      treeCode.trim() || `POHON-${Math.floor(1000 + Math.random() * 9000)}`;
    startTrackingScan(selectedCode, "extracting");

    if (!videoFile) {
      setError("Please select a video file.");
      return;
    }

    setLoading(true);
    try {
      // --- Step 1: Get a presigned R2 PUT URL (no bytes to Render) ---
      setProgressMsg("Preparing upload…");
      const contentType = videoFile.type || "video/mp4";
      const uploadUrlRes = await fetch(
        `${BACKEND_URL}/video_upload_url?filename=${encodeURIComponent(videoFile.name)}&content_type=${encodeURIComponent(contentType)}`
      );
      if (!uploadUrlRes.ok) {
        const d = await uploadUrlRes.json();
        throw new Error(d?.detail || "Failed to get upload URL from server");
      }
      const { url: presignedUrl, key: r2Key } = await uploadUrlRes.json();

      // --- Step 2: PUT video directly to R2 (zero Render bandwidth) ---
      setProgressMsg(`Uploading video directly to cloud storage…`);
      const uploadStartTime = Date.now();
      const putRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: videoFile,
      });
      if (!putRes.ok) {
        throw new Error(`Direct R2 upload failed (HTTP ${putRes.status}). Check CORS config on R2 bucket.`);
      }

      // --- Step 3: Notify Render of the R2 key (tiny JSON, no video bytes) ---
      setProgressMsg("Upload complete. Starting frame extraction on Modal…");
      const r = await fetch(`${BACKEND_URL}/upload_video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Upload-Start-Time": uploadStartTime.toString(),
        },
        body: JSON.stringify({ r2_key: r2Key, frames, blur_thresh: blurThresh }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d?.detail || "Video processing trigger failed");
      }

      let isExtracted = false;
      let attempts = 0;
      const maxAttempts = 300;
      const pollInterval = 1500;

      setProgressMsg("Video uploaded to R2. Waiting for frame extraction to start…");

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

  // ── Stepper Component moved outside ──────────────────────────────────────

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
    if (pipelineStatus?.stage === "reconstructing") {
      activeStageIndex = 1;
    }
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
      <div className="bg-white border border-[#e7e5e4] rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-6 animate-fadeIn">
        <div className="flex justify-between items-center pb-4 border-b border-[#fafaf9]">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#616c39] bg-[#616c39]/10 px-2.5 py-1 rounded-full border border-[#616c39]/20">
              Active Pipeline
            </span>
            <h3 className="font-serif text-xl text-[#292524] font-normal mt-2 tracking-tight">
              {calibrationCode}
            </h3>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#79716b] block">
              Elapsed Time
            </span>
            <span
              className="text-4xl text-[#292524] tracking-wider leading-none"
              style={{ fontFamily: "var(--font-head)" }}
            >
              {formatElapsed(elapsedTime)}
            </span>
          </div>
        </div>

        {/* Hard Timeout Recovery Box (210s) */}
        {elapsedTime > 210 && (
          <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col gap-3">
            <div className="flex items-center gap-2 text-amber-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-bold text-xs uppercase tracking-wider">Processing Hard Timeout (210s)</span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              This reconstruction is taking longer than 3.5 minutes. The GPU cluster may be experiencing a transient queue delay.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  transitionPhase("upload");
                  setError(null);
                }}
                className="px-4 py-2 bg-[#292524] hover:bg-[#292524]/90 text-white text-xs font-semibold rounded-xl transition"
              >
                Retry Scan
              </button>
              <button
                type="button"
                onClick={() => router.push("/gallery")}
                className="px-4 py-2 bg-white border border-[#e7e5e4] hover:bg-[#fafaf9] text-[#292524] text-xs font-semibold rounded-xl transition"
              >
                Check Gallery
              </button>
              <a
                href={`mailto:support@vora.app?subject=Scan%20Timeout%20${calibrationCode}&body=Scan%20${calibrationCode}%20timed%20out%20after%20${elapsedTime}s.`}
                className="px-4 py-2 bg-transparent hover:bg-[#fafaf9] text-[#79716b] text-xs font-medium rounded-xl transition"
              >
                Report Issue
              </a>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6">
          <div className="sm:col-span-5 flex flex-col gap-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#79716b]">
              Processing Asset
            </span>
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-[#e7e5e4]/80 bg-[#1c1917] shadow-inner flex items-center justify-center">
              <img
                src={`${BACKEND_URL}/frames/0000.jpg`}
                alt="Processing asset frame"
                className="w-full h-full object-cover opacity-75"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-md rounded-lg px-2 py-1 text-[10px] text-white font-medium border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4e572c] animate-pulse" />
                <span>Live processing</span>
              </div>
            </div>
          </div>

          <div className="sm:col-span-7 flex flex-col gap-3">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#79716b]">
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
                          ? "bg-[#4e572c] border-[#616c39] text-white text-[10px]"
                          : isCurrent
                          ? "bg-white border-[#292524] ring-2 ring-[#292524]/10 animate-pulse"
                          : "bg-white border-[#e7e5e4]"
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
                        <div className="w-2 h-2 border-2 border-[#292524] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#d6d3d1]" />
                      )}
                    </span>
                    <span
                      className={`text-xs transition-colors ${
                        isDone
                          ? "text-[#79716b] line-through decoration-[#d6d3d1]"
                          : isCurrent
                          ? "text-[#292524] font-bold"
                          : "text-[#79716b]"
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

        <div className="bg-[#fafaf9] border border-[#e7e5e4] rounded-2xl p-4 flex items-center gap-3.5 mt-2">
          <div className="w-8 h-8 rounded-xl bg-white border border-[#e7e5e4] flex items-center justify-center shrink-0">
            <svg
              className="w-4 h-4 text-[#79716b]"
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
          <p className="text-[10px] text-[#79716b] leading-normal">
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
      <div className="fixed inset-0 bg-white overflow-hidden font-sans text-[#292524] flex flex-col pt-14 sm:pt-16">

        {/* Unified Dashboard layout: flex-col on mobile/tablet, flex-row on desktop */}
        <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
          
          {/* 3D Viewer Frame Container (Left/Top Side) */}
          <div className="w-full lg:flex-1 h-[45vh] lg:h-full relative bg-white shrink-0">
          {currentScan && renderViewer ? (
            <iframe
              src={`${BACKEND_URL}/viewer.html?v=11&code=${currentScan.tree_code}&url=${encodeURIComponent(currentScan.splat_file_url)}&proxy=false`}
              allow="xr-spatial-tracking; autoplay; fullscreen"
              className="w-full h-full border-none"
              title="3D Tree Gaussian Splat Viewer"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-[#fafaf9]/50">
              {loading || (currentScan && !renderViewer) ? (
                <>
                  <UiverseLoader />
                  <p className="text-xs text-[#79716b] font-medium animate-pulse">
                    Loading 3D analytics canvas…
                  </p>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-[#79716b] font-medium tracking-wide mb-1">
                    No scan loaded
                  </p>
                  <p className="text-xs text-[#d6d3d1]">
                    Open the details drawer to search a tree code
                  </p>
                </div>
              )}
            </div>
          )}



        {/* Floating Sidebar Toggle (Desktop-only) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              opacity: !currentScan || sceneLoaded ? 1 : 0,
              pointerEvents: !currentScan || sceneLoaded ? "auto" : "none",
              transition: "opacity 0.5s ease 0.1s",
            }}
            className="hidden lg:flex fixed top-[88px] right-6 z-35 p-3 bg-[#292524] text-white hover:bg-[#292524]/90 rounded-full transition-all duration-200 shadow-lg items-center justify-center hover:scale-105 active:scale-95 animate-fadeIn"
            aria-label="Toggle Details Drawer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
        )}

        {/* Desktop-only Carbon Metrics overlays inside the viewer area */}
        {currentScan && (
          <div
            className="hidden lg:flex absolute bottom-6 left-1/2 -translate-x-1/2 z-30 max-w-3xl w-[92%] sm:w-auto flex flex-col gap-2"
            style={{
              opacity: sceneLoaded ? 1 : 0,
              transform: `translateX(-50%) translateY(${sceneLoaded ? 0 : 16}px)`,
              transition: "opacity 0.5s ease, transform 0.5s ease",
              pointerEvents: sceneLoaded ? "auto" : "none",
            }}
          >


            <div className="bg-white/95 backdrop-blur-xl border border-[#e7e5e4]/80 rounded-2xl shadow-xl px-5 py-3 flex items-center justify-between sm:justify-start gap-4 sm:gap-6 divide-x divide-[#fafaf9] overflow-x-auto">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#79716b]">DBH</span>
                  {currentScan.confidence_note?.includes("WARNING") && (
                    <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <title>Warning: insufficient height</title>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                </div>
                <div className="flex items-baseline">
                  <span className="font-serif text-2xl text-[#292524] leading-none">{currentScan.dbh_cm?.toFixed(1) ?? "--"}</span>
                  <span className="text-[11px] text-[#79716b] font-medium ml-1">cm</span>
                </div>
              </div>

              <div className="flex flex-col gap-0.5 pl-4 sm:pl-6">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#79716b]">Height</span>
                <div className="flex items-baseline">
                  <span className="font-serif text-2xl text-[#292524] leading-none">{currentScan.tinggi_m?.toFixed(1) ?? "--"}</span>
                  <span className="text-[11px] text-[#79716b] font-medium ml-1">m</span>
                </div>
              </div>

              <div className="flex flex-col gap-0.5 pl-4 sm:pl-6">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#79716b]">Biomass</span>
                <div className="flex items-baseline">
                  <span className="font-serif text-2xl text-[#292524] leading-none">{currentScan.biomassa_kg?.toFixed(1) ?? "--"}</span>
                  <span className="text-[11px] text-[#79716b] font-medium ml-1">kg</span>
                </div>
              </div>

              <div className="flex flex-col gap-0.5 pl-4 sm:pl-6">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#616c39]">Carbon</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4e572c]" />
                </div>
                <div className="flex items-baseline">
                  <span className="font-serif text-2xl text-[#1c1917] font-normal leading-none">{currentScan.karbon_kg?.toFixed(1) ?? "--"}</span>
                  <span className="text-[11px] text-[#616c39]/70 font-medium ml-1">kg</span>
                </div>
              </div>

              <div className="flex flex-col gap-0.5 pl-4 sm:pl-6">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#79716b]">CO₂e</span>
                <div className="flex items-baseline">
                  <span className="font-serif text-2xl text-[#292524] leading-none">{currentScan.co2e_kg?.toFixed(1) ?? "--"}</span>
                  <span className="text-[11px] text-[#79716b] font-medium ml-1">kg</span>
                </div>
              </div>
            </div>

            {/* Claim scan box for logged-in users */}
            {currentUser && (
              <div className="bg-white/95 backdrop-blur-xl border border-[#e7e5e4]/80 rounded-2xl shadow-xl px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5 w-full sm:w-auto">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#79716b]">Plot & Claim Status</span>
                  <div className="text-xs text-[#292524] font-medium mt-0.5">
                    {currentScan.claimed_by_user_id ? (
                      <span className="text-[#616c39] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4e572c]" />
                        ✓ Claimed to Your Plot
                      </span>
                    ) : (
                      <span>Not claimed to any plot yet</span>
                    )}
                  </div>
                </div>

                {!currentScan.claimed_by_user_id && userPlots.length > 0 && (
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <select
                      value={selectedPlotId}
                      onChange={(e) => setSelectedPlotId(e.target.value)}
                      className="bg-[#fafaf9] border border-[#e7e5e4] rounded-xl px-3 py-1.5 text-xs text-[#292524] focus:outline-none focus:ring-2 focus:ring-[#616c39]/10"
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
                      className="bg-[#4e572c] hover:bg-[#616c39] text-[#1c1917] font-semibold text-xs rounded-xl px-4 py-2 transition-all cursor-pointer whitespace-nowrap"
                    >
                      {claiming ? "Claiming..." : "Claim to Plot"}
                    </button>
                  </div>
                )}

                {!currentScan.claimed_by_user_id && userPlots.length === 0 && (
                  <div className="text-xs text-[#79716b] italic">
                    You don't have any plots yet.{" "}
                    <Link href="/plots/create" className="text-[#616c39] font-bold hover:underline">
                      Create New Plot
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Prompt to log in for guest users */}
            {!currentUser && !currentScan.claimed_by_user_id && (
              <div className="bg-[#161920]/95 backdrop-blur-xl border border-[#292524] text-[#d6d3d1] text-xs rounded-2xl shadow-xl px-5 py-3 flex items-center justify-between gap-4">
                <span>Want to save this scan result to your plot?</span>
                <Link href="/login?redirect=/reconstruct" className="text-[#616c39] font-bold hover:underline shrink-0">
                  Log In & Claim
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

        {/* Sidebar Intelligence Drawer Wrapper (Responsive: Drawer on desktop, scrollable pane below viewer on mobile) */}
        <div
          className={`
            lg:fixed lg:top-0 lg:right-0 lg:bottom-0 lg:z-35 lg:w-96 lg:pt-16 lg:border-l lg:border-[#e7e5e4] lg:shadow-2xl
            lg:transition-transform lg:duration-300 lg:ease-in-out
            ${sidebarOpen ? "lg:translate-x-0" : "lg:translate-x-full"}
            w-full flex-1 bg-white flex flex-col overflow-y-auto lg:overflow-hidden shrink-0
          `}
          style={{
            opacity: !currentScan || sceneLoaded ? 1 : 0,
            pointerEvents: !currentScan || sceneLoaded ? "auto" : "none",
            transition: "opacity 0.5s ease 0.15s, transform 0.3s ease",
          }}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-[#fafaf9] flex items-center justify-between bg-white">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#4e572c]" />
                <span className="text-xs font-bold tracking-wider text-[#292524] uppercase">
                  {activeTreeCode || "Search Tree"}
                </span>
              </div>
              <p className="text-[11px] text-[#79716b] mt-0.5 font-medium">
                {history.length > 0
                  ? `${history.length} scan record${history.length !== 1 ? "s" : ""} found`
                  : "No active scan"}
              </p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-8 h-8 rounded-full bg-[#fafaf9] text-[#79716b] hover:bg-[#e7e5e4] hover:text-[#292524] flex items-center justify-center text-xs transition"
            >
              ✕
            </button>
          </div>

          {/* Scrollable Body */}
          <div data-lenis-prevent className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* Mobile-only Metrics Panel (Replaces absolute overlays on mobile) */}
            {currentScan && (
              <div className="block lg:hidden space-y-4">

                {/* 2x2 grid of metrics */}
                <div className="bg-[#fafaf9] border border-[#e7e5e4] rounded-2xl p-4 grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#79716b]">DBH</span>
                    <div className="flex items-baseline">
                      <span className="font-serif text-xl text-[#292524] font-bold">{currentScan.dbh_cm?.toFixed(1) ?? "--"}</span>
                      <span className="text-[10px] text-[#79716b] font-medium ml-1">cm</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#79716b]">Height</span>
                    <div className="flex items-baseline">
                      <span className="font-serif text-xl text-[#292524] font-bold">{currentScan.tinggi_m?.toFixed(1) ?? "--"}</span>
                      <span className="text-[10px] text-[#79716b] font-medium ml-1">m</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 border-t border-[#e7e5e4] pt-2.5">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#79716b]">Biomass</span>
                    <div className="flex items-baseline">
                      <span className="font-serif text-xl text-[#292524] font-bold">{currentScan.biomassa_kg?.toFixed(1) ?? "--"}</span>
                      <span className="text-[10px] text-[#79716b] font-medium ml-1">kg</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 border-t border-[#e7e5e4] pt-2.5">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#616c39]">Carbon</span>
                    <div className="flex items-baseline">
                      <span className="font-serif text-xl text-[#1c1917] font-bold">{currentScan.karbon_kg?.toFixed(1) ?? "--"}</span>
                      <span className="text-[10px] text-[#616c39]/70 font-medium ml-1">kg</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 col-span-2 border-t border-[#e7e5e4] pt-3">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#79716b]">CO₂ Equivalent (CO₂e)</span>
                    <div className="flex items-baseline">
                      <span className="font-serif text-2xl text-[#292524] font-extrabold">{currentScan.co2e_kg?.toFixed(1) ?? "--"}</span>
                      <span className="text-[11px] text-[#79716b] font-medium ml-1">kg</span>
                    </div>
                  </div>
                </div>

                {/* Mobile Claim Plot Box */}
                {currentUser && (
                  <div className="bg-[#fafaf9] border border-[#e7e5e4] rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#79716b]">Plot & Claim Status</span>
                      <div className="text-xs text-[#292524] font-medium mt-0.5">
                        {currentScan.claimed_by_user_id ? (
                          <span className="text-[#616c39] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#4e572c]" />
                            ✓ Claimed to Your Plot
                          </span>
                        ) : (
                          <span>Not claimed to any plot yet</span>
                        )}
                      </div>
                    </div>
                    {!currentScan.claimed_by_user_id && userPlots.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <select
                          value={selectedPlotId}
                          onChange={(e) => setSelectedPlotId(e.target.value)}
                          className="bg-white border border-[#e7e5e4] rounded-xl px-3 py-2 text-xs text-[#292524] focus:outline-none w-full"
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
                          className="bg-[#4e572c] hover:bg-[#616c39] text-[#1c1917] font-semibold text-xs rounded-xl py-2 transition-all cursor-pointer text-center w-full"
                        >
                          {claiming ? "Claiming..." : "Claim to Plot"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Mobile Login Prompt */}
                {!currentUser && !currentScan.claimed_by_user_id && (
                  <div className="bg-[#161920] border border-[#292524] text-[#a8a29e] text-xs rounded-2xl p-4 flex justify-between items-center gap-4">
                    <span>Want to save this scan result to your plot?</span>
                    <Link href="/login?redirect=/reconstruct" className="text-[#616c39] font-bold hover:underline shrink-0">
                      Log In & Claim
                    </Link>
                  </div>
                )}
              </div>
            )}

            

            {/* Species Classification */}
            {currentScan && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#79716b]">
                    Species Classification
                  </h3>
                  <span className="text-[9px] font-semibold text-[#79716b] bg-[#fafaf9] px-2 py-0.5 rounded-full">
                    Pl@ntNet AI
                  </span>
                </div>

                {predictions && predictions.length > 0 ? (
                  <div className="space-y-3">
                    {predictions[0] && (
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#616c39]/10/80 to-[#fafaf9] border border-[#616c39]/20 relative overflow-hidden">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#616c39] block mb-0.5">
                              Top Specimen Match
                            </span>
                            <h4 className="text-sm font-semibold text-[#292524] italic font-serif">
                              {predictions[0]?.scientific_name ?? "Unknown"}
                            </h4>
                            {predictions[0]?.common_name && (
                              <p className="text-xs text-[#79716b] font-medium capitalize mt-0.5">
                                {predictions[0]?.common_name}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-[#616c39] font-serif">
                              {(predictions[0]?.confidence ?? 0).toFixed(1)}%
                            </span>
                            <span className="text-[9px] text-[#616c39]/70 font-medium">Confidence</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-[#616c39]/15 rounded-full overflow-hidden mt-3">
                          <div
                            className="h-full bg-[#4e572c] rounded-full transition-all duration-700"
                            style={{ width: `${predictions[0]?.confidence ?? 0}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {predictions.length > 1 && (
                      <div className="space-y-2 pt-1">
                        <span className="text-[10px] font-medium text-[#79716b] block px-1">
                          Other Probable Candidates
                        </span>
                        <div className="divide-y divide-[#fafaf9]">
                          {predictions.slice(1).map((pred, idx) => (
                            <div key={idx} className="py-2 px-1 flex items-center justify-between hover:bg-[#fafaf9]/50 rounded-lg transition-colors">
                              <div>
                                <span className="text-xs font-medium text-[#292524] italic block">
                                  {pred.scientific_name}
                                </span>
                                {pred.common_name && (
                                  <span className="text-[10px] text-[#79716b] capitalize block">
                                    {pred.common_name}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-medium text-[#79716b]">
                                {(pred.confidence ?? 0).toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-[#fafaf9]/60 border border-[#fafaf9] text-center">
                    <span className="text-xs text-[#79716b]">Species classification unavailable for this scan</span>
                  </div>
                )}
              </div>
            )}

            {/* How This Was Calculated */}
            {currentScan && (
              <div className="border border-[#e7e5e4]/80 rounded-2xl bg-[#fafaf9]/40 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                <button
                  onClick={() => setCalcOpen(!calcOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#fafaf9] hover:bg-[#fafaf9]/80 text-left transition-all duration-200"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#79716b] flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-[#79716b]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 11h.01M12 7h.01M15 11h.01M15 7h.01M12 14h.01M9 11h.01M18 20V4a1 1 0 00-1-1H7a1 1 0 00-1 1v16a1 1 0 001 1h10a1 1 0 001-1z" />
                    </svg>
                    How this was calculated
                  </span>
                  <span className="text-[#79716b] text-[10px] font-bold">{calcOpen ? "▲" : "▼"}</span>
                </button>

                {calcOpen && (
                  <div className="px-4 pb-4 pt-3 text-xs space-y-3.5 border-t border-[#e7e5e4] bg-white font-sans divide-y divide-[#fafaf9]">
                    <div className="space-y-1.5">
                      <p className="font-semibold text-[#292524] uppercase text-[9px] tracking-wide">1. Input Tree Dimensions</p>
                      <div className="grid grid-cols-2 gap-2 text-[#79716b] font-medium">
                        <div>Diameter (DBH): <span className="font-semibold text-[#292524]">{currentScan.dbh_cm?.toFixed(1) ?? "-"} cm</span></div>
                        <div>Tree Height: <span className="font-semibold text-[#292524]">{currentScan.tinggi_m?.toFixed(1) ?? "-"} m</span></div>
                      </div>
                    </div>

                    <div className="pt-3 space-y-1.5">
                      <p className="font-semibold text-[#292524] uppercase text-[9px] tracking-wide">2. Wood Density Match</p>
                      <div className="space-y-1 text-[#79716b] font-medium">
                        <div>Species Matched: <span className="font-semibold text-[#292524] italic">
                          {predictions?.[0]
                            ? `${predictions[0].scientific_name ?? "Unknown"} (${(predictions[0].confidence ?? 0).toFixed(1)}%)`
                            : "None (Generic Fallback)"}
                        </span></div>
                        <div>Wood Density (ρ): <span className="font-semibold text-[#292524]">{currentScan.wood_density_used?.toFixed(2) ?? "0.60"} g/cm³</span></div>
                        <div>Source: <span className="font-semibold text-[#292524] capitalize">{currentScan.wood_density_source?.replace("-", " ") ?? "generic default"}</span></div>
                      </div>
                    </div>

                    <div className="pt-3 space-y-1.5">
                      <p className="font-semibold text-[#292524] uppercase text-[9px] tracking-wide">3. Climate & Allometric Formula</p>
                      <div className="space-y-1 text-[#79716b] font-medium">
                        <div>GPS Coordinates: <span className="font-semibold text-[#292524]">
                          {currentScan.gps_lat != null && currentScan.gps_lon != null
                            ? `${currentScan.gps_lat.toFixed(4)}, ${currentScan.gps_lon.toFixed(4)}`
                            : "Not Available"}
                        </span></div>
                        <div>Climate Zone (Köppen): <span className="font-semibold text-[#292524]">{currentScan.climate_zone_detected ?? "Unknown"}</span></div>
                        <div>Formula Used: <span className="font-semibold text-[#4e572c]">{currentScan.formula_used ?? "Chave 2005 (moist)"}</span></div>
                        <div>Height Usage: <span className="font-semibold text-[#292524]">
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
                        <div>Root-to-Shoot Ratio: <span className="font-semibold text-[#292524]">{currentScan.root_to_shoot_ratio?.toFixed(2) ?? "0.37"}</span></div>
                        <div>Scale Status: <span className={`font-semibold ${currentScan.scale_status === "calibrated" ? "text-[#616c39]" : "text-red-600"}`}>{currentScan.scale_status === "calibrated" ? "Calibrated" : "Uncalibrated"}</span>{currentScan.scale_factor_used != null && currentScan.scale_factor_used !== 1.0 ? ` (×${currentScan.scale_factor_used?.toFixed(4)})` : ""}</div>
                      </div>
                    </div>

                    <div className="pt-3 space-y-2">
                      <p className="font-semibold text-[#292524] uppercase text-[9px] tracking-wide">4. Calculation Steps</p>
                      <div className="space-y-1.5 text-[#79716b] font-medium font-sans">
                        <div className="flex justify-between">
                          <span>Above-Ground Biomass (AGB):</span>
                          <span className="font-semibold text-[#292524]">{currentScan.agb_kg?.toFixed(1) ?? "-"} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Below-Ground Biomass (BGB):</span>
                          <span className="font-semibold text-[#292524]">{currentScan.bgb_kg?.toFixed(1) ?? "-"} kg <span className="text-[10px] text-[#79716b] font-normal">(AGB × {currentScan.root_to_shoot_ratio?.toFixed(2) ?? "0.37"})</span></span>
                        </div>
                        <div className="flex justify-between border-t border-dashed border-[#fafaf9] pt-1.5 font-bold">
                          <span className="text-[#292524]">Total Dry Biomass:</span>
                          <span className="text-[#292524]">{currentScan.biomassa_kg?.toFixed(1) ?? "-"} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Stored Carbon Stock:</span>
                          <span className="font-semibold text-[#4e572c]">{currentScan.karbon_kg?.toFixed(1) ?? "-"} kg <span className="text-[10px] text-[#616c39]/70 font-normal">(Biomass × 0.47)</span></span>
                        </div>
                        <div className="flex justify-between border-t border-[#fafaf9] pt-1.5 font-bold text-[#1c1917]">
                          <span>CO₂ Equivalent (CO₂e):</span>
                          <span>{currentScan.co2e_kg?.toFixed(1) ?? "-"} kg <span className="text-[10px] text-[#79716b] font-normal">(Carbon × 3.67)</span></span>
                        </div>
                        {currentScan.co2e_low_kg != null && currentScan.co2e_high_kg != null && (
                          <div className="text-[10px] text-[#79716b]">
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
                      className="w-full py-3 bg-[#616c39] hover:bg-[#4e572c] text-white text-xs font-semibold rounded-xl transition shadow-sm flex items-center justify-center gap-2"
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
                      className="w-full py-3 bg-[#fafaf9] hover:bg-[#e7e5e4] text-[#292524] text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2"
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
                        setRecalibImgLoading(true);
                        setRecalibModalOpen(true);
                      }}
                      className="w-full py-3 bg-[#292524] hover:bg-[#292524]/90 text-white text-xs font-semibold rounded-xl transition shadow-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4 text-[#616c39]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.24 11.54a3 3 0 00-4.24-4.24m0 0a3 3 0 00-4.24 4.24m4.24-4.24V3m0 0L8 5.5M11 3l3 2.5M3 12h18m-3 0a3 3 0 01-3 3H9a3 3 0 01-3-3" />
                      </svg>
                      Recalibrate Trunk (2D Photo)
                    </button>
                    {/* On Desktop/Tablet: Show Manual 3D Alignment Button */}
                    <button
                      onClick={() => {
                        setIsEditing3D(true);
                        const iframe = document.querySelector("iframe");
                        if (iframe && iframe.contentWindow) {
                          iframe.contentWindow.postMessage({ type: "start_3d_edit" }, "*");
                        }
                      }}
                      className="hidden md:flex w-full py-3 bg-[#fafaf9] border border-[#e7e5e4] hover:bg-[#fafaf9] text-[#292524] text-xs font-semibold rounded-xl transition items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4 text-[#79716b]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit 3D Alignment (Manual)
                    </button>
                    {/* On Mobile: Show touchscreen limitation message */}
                    <div className="flex md:hidden w-full text-center py-2.5 px-3 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl justify-center items-center">
                      <span className="text-[10px] text-[#79716b] font-medium leading-relaxed">
                        Fitur Edit 3D Alignment memerlukan layar lebih besar (Tablet/Desktop)
                      </span>
                    </div>

                    {/* Download Carbon Certificate Button */}
                    <button
                      onClick={() => {
                        if (currentScan) {
                          window.open(`${BACKEND_URL}/scans/${currentScan.tree_code}/certificate`, "_blank");
                        }
                      }}
                      className="w-full py-3 bg-[#616c39]/10 border border-[#616c39]/30 hover:bg-[#616c39]/15 text-[#4e572c] text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-[#616c39]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      Download Carbon Certificate
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Scan History Timeline */}
            {history.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#79716b] mb-3">
                  Scan History Timeline
                </h3>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <UiverseLoader />
                  </div>
                ) : (
                  <div className="relative pl-4 border-l border-[#e7e5e4] space-y-4">
                    {history.map((record) => {
                      const isActive = currentScan?.id === record.id;
                      return (
                        <div key={record.id} className="relative group">
                          <span
                            className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 bg-white transition-all ${
                              isActive
                                ? "border-[#292524] ring-4 ring-[#292524]/10 bg-[#292524]"
                                : "border-[#e7e5e4] group-hover:border-[#a8a29e]"
                            }`}
                          />
                          <button
                            onClick={() => setCurrentScan(record)}
                            className={`w-full text-left p-3 rounded-xl transition-all ${
                              isActive
                                ? "bg-[#292524] text-white shadow-md"
                                : "hover:bg-[#fafaf9] text-[#292524]"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold uppercase tracking-tight">
                                {record.tree_code}
                              </span>
                              <span className={`text-[10px] font-medium ${isActive ? "text-white/60" : "text-[#79716b]"}`}>
                                #{record.id}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className={`text-[10px] ${isActive ? "text-white/70" : "text-[#79716b]"}`}>
                                {formatDate(record.scan_date)}
                              </span>
                              <span className={`text-[10px] font-serif ${isActive ? "text-[#8a9952]" : "text-[#79716b]"}`}>
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

            {/* Active Scan Warnings (Unified for Desktop & Mobile) */}
            {currentScan && (currentScan.scale_status !== "calibrated" ||
              (currentScan.quality_status && currentScan.quality_status !== "ok" && currentScan.quality_status !== "failed") ||
              currentScan.height_used === "user_manual_height" ||
              currentScan.confidence_note?.includes("WARNING")) && (
              <div className="space-y-2 bg-[#fafaf9] border border-[#e7e5e4] rounded-2xl p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#79716b]">
                    Scan Alerts & Warnings
                  </h3>
                </div>
                <div className="space-y-2">
                  {currentScan.scale_status !== "calibrated" && (
                    <div className="text-[11px] text-red-750 bg-red-50 border border-red-200 rounded-xl p-2.5 leading-relaxed">
                      <strong className="block text-red-800 text-[10px] uppercase font-bold tracking-wider mb-0.5">⚠️ Uncalibrated Scale</strong>
                      DBH/carbon values use default PLY units and are UNRELIABLE. Perform scale calibration (calibrate_scale.py / auto-pose).
                    </div>
                  )}

                  {currentScan.quality_status && currentScan.quality_status !== "ok" && currentScan.quality_status !== "failed" && (() => {
                    const qualityStatusWarnings: Record<string, { title: string; desc: string }> = {
                      low_points: {
                        title: "Low Quality (Point Count)",
                        desc: "Too few points on the DBH slice. Results may be inaccurate.",
                      },
                      high_fit_error: {
                        title: "Low Quality (High Fit Error)",
                        desc: "Average cylinder fitting error exceeds tolerance. Trunk shape is not perfectly circular.",
                      },
                      low_inlier_ratio: {
                        title: "Low Quality (Inlier Ratio)",
                        desc: "The ratio of valid points (inliers) to noise is too low (< 15%). Fitting results may be affected by noise.",
                      },
                      invalid_orientation: {
                        title: "Low Quality (Invalid Orientation)",
                        desc: "The cylinder axis deviates significantly from the tree growth axis, or is detected as flat ground/grass.",
                      },
                    };
                    const warning = qualityStatusWarnings[currentScan.quality_status];
                    if (!warning) return null;
                    return (
                      <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5 leading-relaxed">
                        <strong className="block text-amber-800 text-[10px] uppercase font-bold tracking-wider mb-0.5">
                          ⚠️ {warning.title}
                        </strong>
                        {warning.desc}
                      </div>
                    );
                  })()}

                  {currentScan.height_used === "user_manual_height" && (
                    <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5 leading-relaxed">
                      <strong className="block text-amber-800 text-[10px] uppercase font-bold tracking-wider mb-0.5">⚠️ Tinggi Input Manual</strong>
                      Tinggi diinput manual oleh user — nilai tidak divalidasi otomatis terhadap point cloud.
                    </div>
                  )}

                  {currentScan.confidence_note?.includes("WARNING") && (
                    <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5 leading-relaxed">
                      <strong className="block text-amber-800 text-[10px] uppercase font-bold tracking-wider mb-0.5">⚠️ Tinggi Batang Kurang</strong>
                      {currentScan.confidence_note}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#fafaf9] bg-[#fafaf9]/50">
            <button
              onClick={() => {
                transitionPhase("upload");
                setSubmittedCode(null);
                setError(null);
                setProgressMsg("");
                setVideoFile(null);
                setTreeCode("");
                setCurrentScan(null);
                setHistory([]);
                setActiveTreeCode("");
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#292524] text-white text-xs font-medium rounded-xl hover:bg-[#292524]/90 transition-all shadow-sm"
            >
              <span>+ Upload New Scan</span>
            </button>
          </div>
        </div>
      </div>

        {/* Error toast */}
        {error && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#292524] text-[#ffffff] text-xs px-5 py-3 rounded-xl shadow-lg">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="opacity-50 hover:opacity-100 transition">✕</button>
          </div>
        )}

        {/* 2D Recalibration Modal */}
        {recalibModalOpen && currentScan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div data-lenis-prevent className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#fafaf9] pb-4">
                <div>
                  <h3 className="font-serif text-xl text-[#292524] font-normal">Recalibrate Trunk Axis</h3>
                  <p className="text-xs text-[#79716b] mt-1 font-medium">Click two points on the 2D image to set the trunk direction.</p>
                </div>
                <button
                  onClick={() => { setRecalibModalOpen(false); setClickedPoints([]); }}
                  className="w-8 h-8 rounded-full bg-[#fafaf9] text-[#79716b] hover:bg-[#e7e5e4] hover:text-[#292524] flex items-center justify-center text-xs transition"
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
                  <div className="text-xs font-semibold text-[#79716b] uppercase tracking-wider mb-1">
                    {clickedPoints.length === 0 && "Step 1: Click the BASE of the trunk"}
                    {clickedPoints.length === 1 && "Step 2: Click the TOP/UPPER part of the trunk"}
                    {clickedPoints.length >= 2 && "Step 3: Ready to Recalibrate"}
                  </div>

                  <div
                    className="relative border border-[#e7e5e4] rounded-2xl overflow-hidden bg-[#0c0a09] flex items-center justify-center select-none min-h-[220px]"
                    style={{ maxHeight: "50vh" }}
                  >
                    {recalibImgLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0c0a09]/80 z-10 gap-2">
                        <div className="w-6 h-6 border-2 border-[#616c39] border-t-transparent rounded-full animate-spin" />
                        <span className="text-[11px] text-[#79716b] font-medium">Loading high-res frame…</span>
                      </div>
                    )}
                    <img
                      src={currentScan.thumbnail_url}
                      alt="Representative Scan Frame"
                      onLoad={(e) => {
                        setRecalibImgLoading(false);
                        handleImageLoad(e);
                      }}
                      onError={(e) => {
                        setRecalibImgLoading(false);
                        const fallbackUrl = `${BACKEND_URL}/frames/${currentScan.tree_code}/0000.jpg`;
                        if (e.currentTarget.src !== fallbackUrl) {
                          e.currentTarget.src = fallbackUrl;
                        }
                      }}
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
                <div className="bg-[#fafaf9] border border-[#fafaf9] rounded-2xl p-4 flex flex-col gap-3 h-fit">
                  <h4 className="text-xs font-bold text-[#292524] uppercase tracking-wide">Trunk Click Guide</h4>
                  <div className="flex justify-center py-2 bg-white rounded-xl border border-[#fafaf9]">
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
                  <ul className="text-[11px] text-[#79716b] space-y-2 leading-normal">
                    <li className="flex items-start gap-2">
                      <span className="text-[#616c39] font-bold shrink-0">✓</span>
                      <span><b>Point 1 (Base):</b> Click where the trunk becomes a straight cylinder, slightly <b>above the ground & root flares</b>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#616c39] font-bold shrink-0">✓</span>
                      <span><b>Point 2 (Top):</b> Click higher up on the straight trunk center line.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 font-bold shrink-0">✗</span>
                      <span className="text-red-600/80"><b>Avoid:</b> Clicking the flared root buttress at the absolute bottom.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#fafaf9] pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => { setClickedPoints([]); setMousePos(null); setRecalibError(null); }}
                  disabled={clickedPoints.length === 0 || recalibLoading}
                  className="px-5 py-2.5 bg-[#fafaf9] hover:bg-[#e7e5e4] text-[#292524] text-xs font-semibold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Reset Points
                </button>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setRecalibModalOpen(false); setClickedPoints([]); }}
                    disabled={recalibLoading}
                    className="px-5 py-2.5 bg-white border border-[#e7e5e4] hover:bg-[#fafaf9] text-[#292524] text-xs font-semibold rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRecalibrate}
                    disabled={clickedPoints.length < 2 || recalibLoading}
                    className="px-6 py-2.5 bg-[#292524] hover:bg-[#292524]/90 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
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
    <div className="min-h-screen bg-[#fafaf9]/50 flex flex-col font-sans text-[#292524]">


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
                <p className="text-xs text-[#292524]/50 leading-relaxed font-medium">
                  Upload a video walkthrough to start the 3D pipeline.
                </p>
              </div>

              <div className="bg-white border border-[#e7e5e4] rounded-3xl p-6 sm:p-8 shadow-sm">
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#79716b]">
                      Tree identifier <span className="normal-case tracking-normal font-normal text-[#d6d3d1]">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={treeCode}
                      onChange={(e) => setTreeCode(e.target.value)}
                      placeholder="e.g. POHON-0042"
                      className="px-4 py-2.5 rounded-xl bg-[#fafaf9] border border-[#e7e5e4] focus:outline-none focus:border-[#a8a29e] text-sm font-medium transition"
                      disabled={loading}
                    />
                  </div>


                  
                  <div className="flex items-center gap-3 bg-[#fafaf9] border border-[#e7e5e4]/80 rounded-2xl p-4 mt-2 hover:bg-[#fafaf9]/50 transition">
                    <input
                      type="checkbox"
                      id="removeBackground"
                      checked={removeBackground}
                      onChange={(e) => setRemoveBackground(e.target.checked)}
                      className="w-4 h-4 accent-[#1c1917] cursor-pointer rounded border-[#e7e5e4]"
                      disabled={loading}
                    />
                    <div className="flex flex-col">
                      <label htmlFor="removeBackground" className="text-xs font-bold text-[#292524] cursor-pointer">
                        Remove Background (rembg)
                      </label>
                      <span className="text-[10px] text-[#79716b] leading-normal">
                        Recommendation. Isolate the tree and remove background objects for a clean 3D visualization.
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#79716b]">Video file</label>
                    <div className="relative border-2 border-dashed border-[#e7e5e4] hover:border-[#a8a29e] rounded-2xl p-8 text-center cursor-pointer transition">
                      <input
                        type="file"
                        accept=".mp4,.mov,.avi,.webm,.mkv"
                        onChange={handleVideoChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={loading}
                      />
                      <p className="text-sm font-medium text-[#79716b]">
                        {videoFile ? videoFile.name : "Click or drag to upload"}
                      </p>
                      <p className="text-xs text-[#79716b] mt-1">MP4, MOV, AVI walkthrough — up to 4 GB</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-[#79716b]">
                        <span>Frames</span><span className="text-[#292524]">{frames}</span>
                      </div>
                      <input type="range" min="10" max="100" step="5" value={frames}
                        onChange={(e) => setFrames(+e.target.value)}
                        className="w-full accent-[#1c1917]" disabled={loading} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-[#79716b]">
                        <span>Blur filter</span><span className="text-[#292524]">{blurThresh}</span>
                      </div>
                      <input type="range" min="10" max="200" step="10" value={blurThresh}
                        onChange={(e) => setBlurThresh(+e.target.value)}
                        className="w-full accent-[#1c1917]" disabled={loading} />
                    </div>
                  </div>

                  {loading && (
                    <div className="flex flex-col gap-3 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 border-2 border-[#a8a29e] border-t-transparent rounded-full animate-spin shrink-0" />
                        <p className="text-xs text-[#79716b]">{progressMsg}</p>
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
                    className="w-full py-3 bg-[#292524] hover:bg-[#292524]/90 text-white text-sm font-semibold rounded-xl transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed mt-1"
                  >
                    {loading ? "Processing Upload..." : "Upload & Reconstruct"}
                  </button>
                </form>
              </div>
            </>
          )}

          {/* ── Phase 2: Trunk Marking ── */}
          {phase === "marking" && (
            <div className="bg-white border border-[#e7e5e4] rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-6 animate-fadeIn">
              <div>
                <h3 className="font-serif text-xl text-[#292524] font-normal">Mark Trunk Axis (Recommended)</h3>
                <p className="text-xs text-[#79716b] mt-1.5 font-medium leading-relaxed">
                  Click two points on the extracted first frame image:<br />
                  1. The <b>BASE/ROOT</b> of the trunk (Green marker).<br />
                  2. The <b>TOP/UPPER</b> part of the trunk (Blue marker).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-6">
                <div className="flex flex-col gap-2">
                  <div className="text-[10px] font-bold text-[#616c39] uppercase tracking-wider mb-1">
                    {calibrationPoints.length === 0 && "Step 1: Click the BASE of the trunk"}
                    {calibrationPoints.length === 1 && "Step 2: Click the TOP/UPPER part of the trunk"}
                    {calibrationPoints.length >= 2 && "Step 3: Ready to Reconstruct"}
                  </div>

                  <div className="relative border border-[#e7e5e4] rounded-2xl overflow-hidden bg-[#0c0a09] flex items-center justify-center select-none" style={{ maxHeight: "40vh" }}>
                    <img
                      src={`${BACKEND_URL}/frames/0000.jpg?t=${frameTimestamp}`}
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
                <div className="bg-[#fafaf9] border border-[#fafaf9] rounded-2xl p-4 flex flex-col gap-3 h-fit">
                  <h4 className="text-xs font-bold text-[#292524] uppercase tracking-wide">Trunk Click Guide</h4>
                  <div className="flex justify-center py-2 bg-white rounded-xl border border-[#fafaf9]">
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
                  <ul className="text-[11px] text-[#79716b] space-y-2 leading-normal">
                    <li className="flex items-start gap-2">
                      <span className="text-[#616c39] font-bold shrink-0">✓</span>
                      <span><b>Point 1 (Base):</b> Click where the trunk becomes a straight cylinder, slightly <b>above the ground & root flares</b>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#616c39] font-bold shrink-0">✓</span>
                      <span><b>Point 2 (Top):</b> Click higher up on the straight trunk center line.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 font-bold shrink-0">✗</span>
                      <span className="text-red-600/80"><b>Avoid:</b> Clicking the flared root buttress at the absolute bottom.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
              )}

              <div className="flex flex-col gap-3 border-t border-[#fafaf9] pt-4 mt-2">
                <div className="flex justify-between items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setCalibrationPoints([]); setCalibrationMousePos(null); }}
                    disabled={calibrationPoints.length === 0}
                    className="px-4 py-2.5 bg-[#fafaf9] hover:bg-[#e7e5e4] text-[#292524] text-xs font-semibold rounded-xl transition"
                  >
                    Reset Points
                  </button>
                  <button
                    type="button"
                    onClick={handleSkipAndAutoReconstruct}
                    disabled={loading}
                    className="px-4 py-2.5 bg-white border border-[#e7e5e4] hover:bg-[#fafaf9] text-[#79716b] text-xs font-bold rounded-xl transition disabled:opacity-40"
                  >
                    {loading ? "Starting…" : "Skip & Auto-detect"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleManualReconstruct}
                  disabled={calibrationPoints.length < 2 || loading}
                  className="w-full py-3 bg-[#292524] hover:bg-[#292524]/90 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-40 flex items-center justify-center gap-2"
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

export default function Reconstruct() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#fafaf9]/60 text-[#292524] flex flex-col items-center justify-center font-sans">
        <Loader size={60} className="mb-4" />
        <p className="text-sm text-[#79716b] font-medium">Loading scan page...</p>
      </main>
    }>
      <ReconstructContent />
    </Suspense>
  );
}
