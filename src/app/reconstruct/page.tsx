"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const BACKEND_URL = "https://vora-52k9.onrender.com";

const LogoMark = () => (
  <svg
    viewBox="0 0 256 256"
    fill="currentColor"
    className="w-6 h-6 text-[#191919]"
  >
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
  
  // Files state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<FileList | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setVideoFile(e.target.files[0]);
      setError(null);
    }
  };

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPhotoFiles(e.target.files);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validations
    const selectedTreeCode = treeCode.trim() || `POHON-${Math.floor(1000 + Math.random() * 9000)}`;
    
    if (activeTab === "video" && !videoFile) {
      setError("Please select a video file to upload.");
      return;
    }
    if (activeTab === "photos" && (!photoFiles || photoFiles.length === 0)) {
      setError("Please select one or more photos to upload.");
      return;
    }

    setLoading(true);
    try {
      if (activeTab === "video" && videoFile) {
        setProgressMsg("Uploading video to server (this can take a moment for large files)...");
        const formData = new FormData();
        formData.append("video", videoFile);
        formData.append("frames", frames.toString());
        formData.append("blur_thresh", blurThresh.toString());

        const uploadRes = await fetch(`${BACKEND_URL}/upload_video`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const detail = await uploadRes.json();
          throw new Error(detail?.detail || "Video upload failed");
        }
      } else if (activeTab === "photos" && photoFiles) {
        setProgressMsg(`Uploading ${photoFiles.length} photos...`);
        const formData = new FormData();
        for (let i = 0; i < photoFiles.length; i++) {
          formData.append("photos", photoFiles[i]);
        }

        const uploadRes = await fetch(`${BACKEND_URL}/use_photos`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const detail = await uploadRes.json();
          throw new Error(detail?.detail || "Photos upload failed");
        }
      }

      // Trigger GPU Reconstruction
      setProgressMsg("Upload complete! Starting GPU reconstruction pipeline...");
      const reconstructRes = await fetch(`${BACKEND_URL}/reconstruct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tree_code: selectedTreeCode }),
      });

      if (!reconstructRes.ok) {
        const detail = await reconstructRes.json();
        throw new Error(detail?.detail || "GPU Reconstruction queuing failed");
      }

      const resData = await reconstructRes.json();
      const finalCode = resData.tree_code || selectedTreeCode;

      setProgressMsg("Pipeline started successfully! Redirecting to estimator tracking...");
      // Redirect to estimator page with the tracking tree code
      setTimeout(() => {
        router.push(`/estimator?code=${encodeURIComponent(finalCode)}`);
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during pipeline startup.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden flex flex-col font-sans text-[#191919]">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 sm:px-10 md:px-14 py-4 sm:py-5 flex justify-between items-center bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="font-semibold text-base tracking-tight text-[#191919]">
            Vora
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/estimator" className="text-sm font-medium text-[#191919]/75 hover:text-[#191919] transition">
            Estimator
          </Link>
          <Link href="/" className="text-sm font-medium text-[#191919]/75 hover:text-[#191919] transition">
            Home
          </Link>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 pt-24 pb-16 px-4 md:p-6 lg:p-8 max-w-[1200px] w-full mx-auto flex flex-col mt-4">
        
        {/* Page Title Header */}
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 mb-8 shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight mb-2">
            Start 3D Reconstruction
          </h2>
          <p className="text-sm text-[#191919]/60 leading-relaxed max-w-2xl">
            Upload your recordings or photo libraries to convert physical tree data into high-density 3D Gaussian Splats on our GPU cloud, estimating carbon capture potential.
          </p>
        </div>

        {/* Form and Guide Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Form Controls */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            
            {/* Tabs selector */}
            <div className="flex gap-1 mb-8 bg-slate-100 rounded-xl p-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("video");
                  setError(null);
                }}
                className={`flex-1 text-center py-2.5 rounded-lg text-sm font-semibold transition ${
                  activeTab === "video"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                🎥 Video Upload
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("photos");
                  setError(null);
                }}
                className={`flex-1 text-center py-2.5 rounded-lg text-sm font-semibold transition ${
                  activeTab === "photos"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                📸 Photos Upload
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              
              {/* Tree Code Input */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Tree Code / Identifier
                </label>
                <input
                  type="text"
                  value={treeCode}
                  onChange={(e) => setTreeCode(e.target.value)}
                  placeholder="e.g. TEST-0002 (Optional)"
                  className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-slate-450 transition text-sm font-semibold"
                  disabled={loading}
                />
                <span className="text-[10px] text-slate-400">
                  If left empty, a code in format POHON-XXXX will be auto-generated.
                </span>
              </div>

              {/* Video Fields Group */}
              {activeTab === "video" && (
                <>
                  {/* File Upload Area */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Upload Video File
                    </label>
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 hover:bg-slate-50/50 hover:border-slate-400 transition text-center relative cursor-pointer">
                      <input
                        type="file"
                        accept=".mp4,.mov,.avi,.webm,.mkv"
                        onChange={handleVideoChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={loading}
                      />
                      <span className="text-3xl mb-2 block">📁</span>
                      <span className="text-sm font-semibold block text-slate-700">
                        {videoFile ? videoFile.name : "Drag & drop video file or click to browse"}
                      </span>
                      <span className="text-xs text-slate-450 mt-1 block">
                        Supported: MP4, MOV, AVI, WEBM, MKV (up to 4 GB)
                      </span>
                    </div>
                  </div>

                  {/* Extraction Settings Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Target Frames slider */}
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-400">
                        <span>Target Frames</span>
                        <span className="text-[#191919]">{frames}</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={frames}
                        onChange={(e) => setFrames(parseInt(e.target.value))}
                        className="w-full accent-slate-900 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                        disabled={loading}
                      />
                      <span className="text-[10px] text-slate-400">
                        Total frames extracted from loop sequence.
                      </span>
                    </div>

                    {/* Blur Threshold slider */}
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-400">
                        <span>Blur Threshold</span>
                        <span className="text-[#191919]">{blurThresh}</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="200"
                        step="10"
                        value={blurThresh}
                        onChange={(e) => setBlurThresh(parseInt(e.target.value))}
                        className="w-full accent-slate-900 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                        disabled={loading}
                      />
                      <span className="text-[10px] text-slate-400">
                        Higher threshold filters blurry frames.
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Photo Fields Group */}
              {activeTab === "photos" && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Upload Photo Directory
                  </label>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 hover:bg-slate-50/50 hover:border-slate-400 transition text-center relative cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotosChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={loading}
                    />
                    <span className="text-3xl mb-2 block">📂</span>
                    <span className="text-sm font-semibold block text-slate-700">
                      {photoFiles ? `${photoFiles.length} photos selected` : "Drag & drop photos or click to browse"}
                    </span>
                    <span className="text-xs text-slate-450 mt-1 block">
                      Select multiple images covering all angles of the tree.
                    </span>
                  </div>
                </div>
              )}

              {/* Progress and status box */}
              {loading && (
                <div className="bg-slate-100 rounded-2xl p-4 flex flex-col gap-3 items-center text-center">
                  <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-medium text-slate-700 leading-relaxed italic">
                    {progressMsg}
                  </p>
                </div>
              )}

              {/* Error box */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xl">
                  ⚠️ {error}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition shadow-md disabled:bg-slate-300 disabled:shadow-none"
                disabled={loading}
              >
                {loading ? "Initializing..." : "Upload & Reconstruct"}
              </button>

            </form>
          </div>

          {/* Right Column: Scanning Guidelines Card */}
          <div className="lg:col-span-5 bg-[#F4F3F3] border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col gap-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block">
              Scan Guidelines
            </span>
            <h3 className="font-serif text-xl font-normal text-[#191919] leading-tight border-b border-slate-200 pb-3">
              How to film your tree
            </h3>

            <div className="flex flex-col gap-5">
              
              {/* Point 1 */}
              <div className="flex items-start gap-3">
                <span className="text-[#191919] font-serif text-lg leading-none">01</span>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">Slow & Steady Loop</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Walk in a smooth circular path (360 degrees) around the tree. Keep your movements slow and avoid sudden camera shakes or jerks.
                  </p>
                </div>
              </div>

              {/* Point 2 */}
              <div className="flex items-start gap-3">
                <span className="text-[#191919] font-serif text-lg leading-none">02</span>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">Capture Trunk Height</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Ensure the camera views the main trunk continuously, especially the breast-height section (around 1.3 meters), as well as the crown top.
                  </p>
                </div>
              </div>

              {/* Point 3 */}
              <div className="flex items-start gap-3">
                <span className="text-[#191919] font-serif text-lg leading-none">03</span>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">Diffuse daylight</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Scans captured on overcast/cloudy days or during early morning or sunset will yield the sharpest models, free from high-contrast shadows.
                  </p>
                </div>
              </div>

              {/* Point 4 */}
              <div className="flex items-start gap-3">
                <span className="text-[#191919] font-serif text-lg leading-none">04</span>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">Photo Sets Alternative</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    If uploading photo folders, capture 20 to 50 photos from different vertical positions and horizontal spacing around the tree with 60%+ overlap.
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#191919] border-t border-[#191919] py-12 px-6 sm:px-10 text-center">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/50">
          <p>© 2026 Vora. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <Link href="/estimator" className="hover:text-white transition">Estimator</Link>
            <Link href="/example" className="hover:text-white transition">Example</Link>
            <a href="#privacy" className="hover:text-white transition">Privacy Policy</a>
            <a href="#terms" className="hover:text-white transition">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
