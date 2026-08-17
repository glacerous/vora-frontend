"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useScanProgress } from "./ScanProgressProvider";
import { useSettings } from "@/components/AuthProvider";

export default function ScanProgressPill() {
  const { scan, resetScan } = useScanProgress();
  const { language } = useSettings();
  const pathname = usePathname();
  const router = useRouter();

  // Do not render the floating pill on /reconstruct page because the main page shows the full view
  if (!scan.treeCode || scan.stage === "idle" || pathname === "/reconstruct") {
    return null;
  }

  const isDone = scan.stage === "done";
  const isErr = scan.stage === "error" || scan.stage === "timeout";
  const isRunning = scan.stage === "extracting" || scan.stage === "reconstructing" || scan.stage === "extracted";

  return (
    <aside aria-label="Active Scan Progress" className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div
        className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all ${
          isDone
            ? "bg-[#1c1917]/95 border-[#616c39]/50 text-[#fafaf9] shadow-[0_20px_35px_rgba(0,0,0,0.35)]"
            : isErr
            ? "bg-red-950/90 border-red-500/40 text-red-100 shadow-red-950/40"
            : "bg-[#1c1917]/95 border-[#616c39]/40 text-[#fafaf9] shadow-[0_20px_35px_rgba(0,0,0,0.35)]"
        }`}
      >
        {/* State Icon Indicator */}
        <div className="relative flex items-center justify-center">
          {isRunning && (
            <div className="relative flex items-center justify-center w-8 h-8">
              <div className="w-8 h-8 rounded-full border-2 border-[#616c39]/30 border-t-[#616c39] animate-spin" />
              <div className="absolute w-2 h-2 bg-[#616c39] rounded-full animate-pulse" />
            </div>
          )}
          {isDone && (
            <div className="w-8 h-8 rounded-full bg-[#616c39]/20 border border-[#616c39]/40 flex items-center justify-center text-[#616c39]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {isErr && (
            <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-400/40 flex items-center justify-center text-red-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          )}
        </div>

        {/* Scan Details */}
        <div className="flex flex-col pr-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold tracking-wider text-[#616c39]">
              {scan.treeCode}
            </span>
            {isRunning && scan.elapsedSeconds > 0 && (
              <span className="text-[10px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded font-mono">
                {scan.elapsedSeconds}s
              </span>
            )}
          </div>
          <span className="text-xs font-medium text-gray-200 truncate max-w-[200px]">
            {scan.subStage || scan.message}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
          {isRunning && (
            <button
              onClick={() => router.push(`/reconstruct?code=${encodeURIComponent(scan.treeCode || "")}&phase=processing`)}
              className="px-3 py-1.5 bg-[#616c39] hover:bg-[#616c39] text-black font-semibold text-xs rounded-xl transition shadow-sm cursor-pointer"
            >
              {language === "id" ? "Lihat" : "View"}
            </button>
          )}
          {isDone && (
            <button
              onClick={() => router.push(`/reconstruct?code=${encodeURIComponent(scan.treeCode || "")}`)}
              className="px-3 py-1.5 bg-[#616c39] hover:bg-[#616c39] text-black font-semibold text-xs rounded-xl transition shadow-sm cursor-pointer"
            >
              {language === "id" ? "Buka 3D" : "Open 3D"}
            </button>
          )}
          {(isErr || isDone) && (
            <button
              onClick={resetScan}
              className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              title={language === "id" ? "Tutup" : "Dismiss"}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
