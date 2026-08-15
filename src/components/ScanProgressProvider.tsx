"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface ScanState {
  treeCode: string | null;
  stage: "idle" | "extracting" | "extracted" | "reconstructing" | "done" | "error" | "timeout";
  message: string;
  frameCount: number;
  error: string | null;
  startedAt: number | null;
  elapsedSeconds: number;
  subStage: string;
  hasResult: boolean;
  splatUrl?: string;
  isTimedOut: boolean;
}

interface ScanContextType {
  scan: ScanState;
  startTrackingScan: (treeCode: string, stage?: ScanState["stage"]) => void;
  resetScan: () => void;
  cancelActiveScan: () => Promise<void>;
  updateScanState: (partial: Partial<ScanState>) => void;
}

const defaultScanState: ScanState = {
  treeCode: null,
  stage: "idle",
  message: "Ready",
  frameCount: 0,
  error: null,
  startedAt: null,
  elapsedSeconds: 0,
  subStage: "Idle",
  hasResult: false,
  isTimedOut: false,
};

const ScanContext = createContext<ScanContextType>({
  scan: defaultScanState,
  startTrackingScan: () => {},
  resetScan: () => {},
  cancelActiveScan: async () => {},
  updateScanState: () => {},
});

const MAX_PIPELINE_TIMEOUT_SECONDS = 210;

export function ScanProgressProvider({ children }: { children: React.ReactNode }) {
  const [scan, setScan] = useState<ScanState>(defaultScanState);
  const router = useRouter();
  const pathname = usePathname();
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to compute user-friendly sub-stage text
  const deriveSubStage = (stage: string, message: string): string => {
    const msg = (message || "").toLowerCase();
    if (stage === "extracting") {
      if (msg.includes("offloading") || msg.includes("r2")) return "Downloading & Extracting Frames";
      if (msg.includes("saving")) return "Saving Sharp Frames";
      return "Extracting Video Frames";
    }
    if (stage === "reconstructing") {
      if (msg.includes("uploading images") || msg.includes("sending")) return "Uploading Frames to GPU";
      if (msg.includes("validating") || msg.includes("geometry")) return "Initializing 3D Geometry";
      if (msg.includes("training") || msg.includes("gaussian")) return "Training 3D Gaussians (2000 iters)";
      if (msg.includes("alignment") || msg.includes("icp") || msg.includes("filtering")) return "Aligning Point Cloud";
      if (msg.includes("species") || msg.includes("plantnet")) return "Identifying Species (Pl@ntNet)";
      if (msg.includes("carbon") || msg.includes("dbh") || msg.includes("estimating")) return "Estimating DBH & Carbon";
      if (msg.includes("saving") || msg.includes("uploading results") || msg.includes("cloudflare")) return "Persisting to Cloud";
      return "Reconstructing 3D Tree";
    }
    if (stage === "extracted") return "Frames Ready for Marking";
    if (stage === "done") return "Reconstruction Complete";
    if (stage === "error") return "Pipeline Failed";
    if (stage === "timeout") return "Pipeline Timed Out";
    return "Ready";
  };

  // Restore active scan from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedCode = localStorage.getItem("vora_active_scan_code");
        const storedStarted = localStorage.getItem("vora_active_scan_started");
        if (storedCode) {
          const startedAt = storedStarted ? parseInt(storedStarted, 10) : Date.now();
          const elapsed = Math.floor((Date.now() - startedAt) / 1000);
          if (elapsed < 600) {
            setScan((prev) => ({
              ...prev,
              treeCode: storedCode,
              startedAt,
              elapsedSeconds: elapsed,
              stage: "reconstructing",
              message: "Resuming pipeline monitor…",
              subStage: "Monitoring Background Job",
            }));
          } else {
            localStorage.removeItem("vora_active_scan_code");
            localStorage.removeItem("vora_active_scan_started");
          }
        }
      } catch (e) {
        console.warn("Could not read stored scan state:", e);
      }
    }
  }, []);

  const updateScanState = useCallback((partial: Partial<ScanState>) => {
    setScan((prev) => {
      const next = { ...prev, ...partial };
      if (partial.message || partial.stage) {
        next.subStage = deriveSubStage(next.stage, next.message);
      }
      return next;
    });
  }, []);

  const startTrackingScan = useCallback((treeCode: string, stage: ScanState["stage"] = "extracting") => {
    const now = Date.now();
    if (typeof window !== "undefined") {
      localStorage.setItem("vora_active_scan_code", treeCode);
      localStorage.setItem("vora_active_scan_started", now.toString());
    }
    setScan({
      treeCode,
      stage,
      message: "Starting pipeline…",
      frameCount: 0,
      error: null,
      startedAt: now,
      elapsedSeconds: 0,
      subStage: deriveSubStage(stage, "Starting pipeline…"),
      hasResult: false,
      isTimedOut: false,
    });
  }, []);

  const resetScan = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("vora_active_scan_code");
      localStorage.removeItem("vora_active_scan_started");
    }
    setScan(defaultScanState);
  }, []);

  const cancelActiveScan = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://glacerous-3dtest.hf.space";
      const code = scan.treeCode;
      await fetch(`${apiUrl}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tree_code: code }),
      });
    } catch (err) {
      console.warn("Cancel request failed:", err);
    } finally {
      resetScan();
    }
  }, [scan.treeCode, resetScan]);

  // Polling loop
  useEffect(() => {
    if (!scan.treeCode || scan.stage === "idle" || scan.stage === "done" || scan.stage === "error" || scan.stage === "timeout") {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://glacerous-3dtest.hf.space";

    const poll = async () => {
      try {
        const started = scan.startedAt || Date.now();
        const elapsed = Math.floor((Date.now() - started) / 1000);

        // Check hard timeout
        if (elapsed > MAX_PIPELINE_TIMEOUT_SECONDS && scan.stage === "reconstructing") {
          setScan((prev) => ({
            ...prev,
            stage: "timeout",
            isTimedOut: true,
            elapsedSeconds: elapsed,
            subStage: "Hard Timeout Exceeded",
            error: "Reconstruction took longer than 210 seconds. The cloud GPU may have encountered a transient queue delay or error.",
          }));
          return;
        }

        const res = await fetch(`${apiUrl}/status/${scan.treeCode}`, { cache: "no-store" });
        if (!res.ok) {
          // Fallback to generic status
          const fallbackRes = await fetch(`${apiUrl}/status`, { cache: "no-store" });
          if (!fallbackRes.ok) return;
          const data = await fallbackRes.json();
          processStatusData(data, elapsed);
          return;
        }
        const data = await res.json();
        processStatusData(data, elapsed);
      } catch (e) {
        console.warn("Status polling error:", e);
      }
    };

    const processStatusData = (data: any, elapsed: number) => {
      const serverStage = data.stage || "idle";
      const serverMsg = data.message || "";
      const isDone = serverStage === "done";
      const isErr = serverStage === "error" || !!data.error;

      if (isDone) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("vora_active_scan_code");
          localStorage.removeItem("vora_active_scan_started");
        }
      }

      setScan((prev) => ({
        ...prev,
        stage: isErr ? "error" : isDone ? "done" : (serverStage as any),
        message: serverMsg,
        frameCount: data.frame_count || prev.frameCount,
        error: data.error || null,
        hasResult: data.has_result || false,
        elapsedSeconds: elapsed,
        subStage: deriveSubStage(serverStage, serverMsg),
      }));
    };

    poll();
    pollTimerRef.current = setInterval(poll, 2500);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [scan.treeCode, scan.stage, scan.startedAt]);

  return (
    <ScanContext.Provider
      value={{
        scan,
        startTrackingScan,
        resetScan,
        cancelActiveScan,
        updateScanState,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
}

export function useScanProgress() {
  return useContext(ScanContext);
}
