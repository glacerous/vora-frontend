"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const BACKEND_URL = "https://vora-52k9.onrender.com";

const LogoMark = () => (
  <svg viewBox="0 0 256 256" fill="currentColor" className="w-6 h-6 text-[#191919]">
    <path d="M 144 256 L 27.598 256 L 144 139.598 Z" />
    <path d="M 256 207.5 L 200 256 L 200 56 L 0 56 L 48 0 L 256 0 Z" />
    <path d="M 0 204.402 L 0 112 L 92.402 112 Z" />
  </svg>
);

export default function Reconstruct() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"video" | "photos">("video");
  const [treeCode, setTreeCode] = useState("");
  const [frames, setFrames] = useState(25);
  const [blurThresh, setBlurThresh] = useState(80);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) { setVideoFile(e.target.files[0]); setError(null); }
  };
  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) { setPhotoFiles(e.target.files); setError(null); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const selectedCode = treeCode.trim() || `POHON-${Math.floor(1000 + Math.random() * 9000)}`;

    if (activeTab === "video" && !videoFile) { setError("Please select a video file."); return; }
    if (activeTab === "photos" && !photoFiles?.length) { setError("Please select at least one photo."); return; }

    setLoading(true);
    try {
      if (activeTab === "video" && videoFile) {
        setProgressMsg("Uploading video…");
        const fd = new FormData();
        fd.append("video", videoFile);
        fd.append("frames", frames.toString());
        fd.append("blur_thresh", blurThresh.toString());
        const r = await fetch(`${BACKEND_URL}/upload_video`, { method: "POST", body: fd });
        if (!r.ok) { const d = await r.json(); throw new Error(d?.detail || "Video upload failed"); }
      } else if (activeTab === "photos" && photoFiles) {
        setProgressMsg(`Uploading ${photoFiles.length} photos…`);
        const fd = new FormData();
        for (let i = 0; i < photoFiles.length; i++) fd.append("photos", photoFiles[i]);
        const r = await fetch(`${BACKEND_URL}/use_photos`, { method: "POST", body: fd });
        if (!r.ok) { const d = await r.json(); throw new Error(d?.detail || "Photos upload failed"); }
      }

      setProgressMsg("Starting GPU reconstruction…");
      const r = await fetch(`${BACKEND_URL}/reconstruct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tree_code: selectedCode }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d?.detail || "Reconstruction queuing failed"); }

      const data = await r.json();
      setProgressMsg("Pipeline started — redirecting…");
      setTimeout(() => router.push(`/estimator?code=${encodeURIComponent(data.tree_code || selectedCode)}`), 800);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-[#191919]">

      {/* ── Navbar — same as landing page ──────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 sm:px-10 md:px-14 py-4 sm:py-5 flex justify-between items-center bg-white/90 backdrop-blur-sm border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2.5 cursor-pointer">
          <LogoMark />
          <span className="font-semibold text-base tracking-tight text-[#191919]">Vora</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/estimator" className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200">
            Estimator
          </Link>
          <Link href="/" className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200">
            Home
          </Link>
        </div>
      </nav>

      {/* ── Main — centred single column ───────────────────────── */}
      <main className="flex-1 flex items-start justify-center pt-28 pb-20 px-4">
        <div className="w-full max-w-lg">

          {/* Page heading */}
          <div className="mb-8">
            <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight mb-2">
              New reconstruction
            </h1>
            <p className="text-sm text-[#191919]/50 leading-relaxed">
              Upload a video walkthrough or photo set to start the 3D pipeline.
            </p>
          </div>

          {/* Upload form */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">

            {/* Tabs */}
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

              {/* Tree code */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
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

              {/* Video tab */}
              {activeTab === "video" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">Video file</label>
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
                      <p className="text-xs text-slate-400 mt-1">MP4, MOV, AVI, WEBM, MKV — up to 4 GB</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs font-semibold uppercase tracking-widest text-slate-400">
                        <span>Frames</span><span className="text-[#191919]">{frames}</span>
                      </div>
                      <input type="range" min="10" max="100" step="5" value={frames}
                        onChange={(e) => setFrames(+e.target.value)}
                        className="w-full accent-slate-900" disabled={loading} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs font-semibold uppercase tracking-widest text-slate-400">
                        <span>Blur filter</span><span className="text-[#191919]">{blurThresh}</span>
                      </div>
                      <input type="range" min="10" max="200" step="10" value={blurThresh}
                        onChange={(e) => setBlurThresh(+e.target.value)}
                        className="w-full accent-slate-900" disabled={loading} />
                    </div>
                  </div>
                </>
              )}

              {/* Photos tab */}
              {activeTab === "photos" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">Photo files</label>
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

              {/* Progress */}
              {loading && (
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  <p className="text-xs text-slate-600">{progressMsg}</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#191919] hover:bg-[#191919]/90 text-white text-sm font-medium rounded-xl transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed mt-1"
              >
                {loading ? "Initializing…" : "Upload & Reconstruct"}
              </button>

            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
