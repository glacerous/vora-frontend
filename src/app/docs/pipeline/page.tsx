"use client";

import React from "react";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { useSettings } from "@/components/AuthProvider";

export default function PipelineDocPage() {
  const { language } = useSettings();
  const isId = language === "id";

  return (
    <main className="min-h-screen bg-[#fafaf9] text-[#292524] pt-28 sm:pt-36 pb-24 px-6 sm:px-8 max-w-[1100px] mx-auto w-full font-sans selection:bg-[#616c39]/15">
      
      {/* Breadcrumb & Eyebrow */}
      <div className="flex items-center gap-2 text-xs font-mono text-[#79716b] mb-6">
        <Link href="/" className="hover:text-[#292524] transition">
          {isId ? "Beranda" : "Home"}
        </Link>
        <span>/</span>
        <span className="text-[#616c39] font-semibold">
          {isId ? "Metodologi 3D Splatting" : "3D Splatting Pipeline"}
        </span>
      </div>

      {/* Hero Title */}
      <Reveal>
        <div className="mb-12">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.10em] text-[#616c39] block mb-2">
            #01 — ARCHITECTURE SPECIFICATION
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl text-[#292524] font-normal tracking-tight leading-tight max-w-3xl">
            {isId
              ? "Pipeline Rekonstruksi Volumetrik 3D Gaussian Splatting."
              : "3D Gaussian Splatting Volumetric Reconstruction Pipeline."}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[#79716b] max-w-2xl leading-relaxed">
            {isId
              ? "Pelajari bagaimana Vora mentransformasi video perputaran 360° dari ponsel pintar biasa menjadi representasi 3D berakurasi milimeter dengan isolasi kontur tanah dan pengepasan diameter batang."
              : "Discover how Vora transforms standard 360° smartphone video into millimeter-accurate 3D volumetric models with terrain slope isolation and trunk diameter fitting."}
          </p>
        </div>
      </Reveal>

      {/* Interactive Quick Links / Action CTAs */}
      <div className="flex flex-wrap gap-3.5 mb-14">
        <Link
          href="/example"
          className="px-5 py-2.5 bg-[#616c39] hover:bg-[#4e572c] text-white text-xs sm:text-sm font-semibold uppercase tracking-[0.04em] rounded-lg transition-colors flex items-center gap-2 shadow-none cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
          </svg>
          {isId ? "Buka Contoh 3D Viewer Langsung" : "Open Live 3D Viewer Demo"}
        </Link>
        <Link
          href="/reconstruct"
          className="px-5 py-2.5 border border-[#e7e5e4] hover:border-[#292524] text-[#292524] text-xs sm:text-sm font-semibold uppercase tracking-[0.04em] rounded-lg transition-colors bg-white cursor-pointer"
        >
          {isId ? "Scan Video Baru" : "Scan New Video"}
        </Link>
      </div>

      {/* ── Step-by-Step Architecture Pipeline ── */}
      <div className="space-y-8">
        
        {/* Stage 1 */}
        <Reveal delay={0.1}>
          <div className="bg-white border border-[#e7e5e4] rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-xl bg-[#616c39]/10 text-[#616c39] font-mono font-bold text-sm flex items-center justify-center">
                01
              </span>
              <h2 className="font-mono text-base sm:text-lg font-semibold text-[#292524]">
                {isId ? "Ekstraksi Frame Adaptif & Seleksi Blur" : "Adaptive Frame Extraction & Blur Filtering"}
              </h2>
            </div>
            <p className="text-sm text-[#79716b] leading-relaxed mb-4">
              {isId
                ? "Video 360° yang diunggah diproses menggunakan OpenCV untuk mendeteksi varians Laplacian pada setiap frame. Frame yang mengalami motion blur atau pergerakan kamera terlalu cepat secara otomatis dieliminasi untuk menyisakan 48–72 sudut pandang dengan tumpang-tindih (overlap) tinggi."
                : "Uploaded 360° videos are processed using OpenCV with Laplacian variance detection. Frames with excessive motion blur or rapid angular acceleration are filtered out, maintaining 48–72 optimal high-overlap views."}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#fafaf9] p-3.5 rounded-xl border border-[#e7e5e4] font-mono text-xs text-[#79716b]">
              <div>
                <span className="block text-[#292524] font-semibold">{isId ? "Target Frame" : "Target Frames"}</span>
                <span>48–64 Keyframes</span>
              </div>
              <div>
                <span className="block text-[#292524] font-semibold">{isId ? "Resolusi Input" : "Input Resolution"}</span>
                <span>800px / 1080p Downscale</span>
              </div>
              <div>
                <span className="block text-[#292524] font-semibold">{isId ? "Metrik Blur" : "Blur Metric"}</span>
                <span>Laplacian Var &gt; 120.0</span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Stage 2 */}
        <Reveal delay={0.15}>
          <div className="bg-white border border-[#e7e5e4] rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-xl bg-[#616c39]/10 text-[#616c39] font-mono font-bold text-sm flex items-center justify-center">
                02
              </span>
              <h2 className="font-mono text-base sm:text-lg font-semibold text-[#292524]">
                {isId ? "Estimasi Pose Kamera & MASt3R Dense Matching" : "Camera Pose Estimation & MASt3R Dense Matching"}
              </h2>
            </div>
            <p className="text-sm text-[#79716b] leading-relaxed mb-4">
              {isId
                ? "Tidak seperti metode SfM konvensional (seperti COLMAP) yang memakan waktu 15–30 menit dan rentan gagal pada tekstur kulit pohon yang homogen, MASt3R menggunakan arsitektur transformer visual feed-forward untuk memprediksi point map 3D lokal dan pose kamera relatif dalam hitungan detik."
                : "Unlike classical SfM (e.g. COLMAP) which requires 15–30 minutes and struggles with repetitive bark texture, MASt3R leverages feed-forward vision transformers to directly regress local 3D point maps and relative camera poses in seconds."}
            </p>
            <div className="p-4 bg-[#fafaf9] rounded-xl border border-[#e7e5e4] font-mono text-xs text-[#292524]">
              <div className="flex justify-between items-center text-[11px] text-[#79716b] pb-2 border-b border-[#e7e5e4]">
                <span>BENCHMARK WAKTU ALIGNMENT</span>
                <span className="text-[#616c39] font-bold">12x LEBIH CEPAT</span>
              </div>
              <div className="mt-2 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#79716b]">COLMAP SfM Klasik:</span>
                  <span>~14 menit 20 detik</span>
                </div>
                <div className="flex justify-between font-bold text-[#616c39]">
                  <span>Vora MASt3R Alignment:</span>
                  <span>~42 detik (A10G GPU)</span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Stage 3 */}
        <Reveal delay={0.2}>
          <div className="bg-white border border-[#e7e5e4] rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-xl bg-[#616c39]/10 text-[#616c39] font-mono font-bold text-sm flex items-center justify-center">
                03
              </span>
              <h2 className="font-mono text-base sm:text-lg font-semibold text-[#292524]">
                {isId ? "Isolasi Bidang Tanah RANSAC & Pengepasan DBH" : "RANSAC Ground Plane Isolation & DBH Cylinder Fitting"}
              </h2>
            </div>
            <p className="text-sm text-[#79716b] leading-relaxed mb-4">
              {isId
                ? "Algoritma RANSAC (Random Sample Consensus) mengekstrak persamaan bidang tanah ax + by + cz + d = 0 dari point cloud untuk mengompensasi kemiringan lereng topografi hutan. Sistem kemudian memotong silinder batang tepat pada ketinggian standar dada (1,30 m di atas tanah) dan melakukan circle fitting untuk mendapatkan DBH akurat."
                : "A 3D RANSAC algorithm extracts the ground terrain plane equation ax + by + cz + d = 0 to normalize slope angles in forestry plots. The system slices a trunk cross-section at standard breast height (1.30m above ground) and fits an algebraic circle to extract the true DBH."}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 bg-[#fafaf9] rounded-xl border border-[#e7e5e4]">
                <span className="text-[#79716b] block text-[11px]">STANDAR TINGGI PENGUKURAN</span>
                <span className="text-sm font-semibold text-[#292524]">1.30 Meter (Breast Height)</span>
              </div>
              <div className="p-3 bg-[#fafaf9] rounded-xl border border-[#e7e5e4]">
                <span className="text-[#79716b] block text-[11px]">TOLERANSI AKURASI DIAMETER</span>
                <span className="text-sm font-semibold text-[#616c39]">± 1.5 cm vs Pita Ukur Diameter</span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Stage 4 */}
        <Reveal delay={0.25}>
          <div className="bg-white border border-[#e7e5e4] rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-xl bg-[#616c39]/10 text-[#616c39] font-mono font-bold text-sm flex items-center justify-center">
                04
              </span>
              <h2 className="font-mono text-base sm:text-lg font-semibold text-[#292524]">
                {isId ? "Optimasi 3D Gaussian Splatting & Kompresi .ksplat" : "3D Gaussian Splatting Optimization & .ksplat Compression"}
              </h2>
            </div>
            <p className="text-sm text-[#79716b] leading-relaxed mb-4">
              {isId
                ? "Representasi 3D dioptimasi menjadi kumpulan ellipsoida Gaussian 3D dengan warna spherical harmonics, opasitas, skala, dan rotasi quaternion. Model kemudian dikompresi ke format .ksplat terkuantisasi 8-bit untuk rendering instan 60 FPS di WebGL peramban tanpa memerlukan plugin tambahan."
                : "The 3D representation is optimized into millions of 3D Gaussian ellipsoids parameterized by spherical harmonics color, opacity, scale, and quaternion rotation. The model is compressed into a quantized 8-bit .ksplat bundle for 60 FPS zero-install WebGL rendering directly in modern browsers."}
            </p>
          </div>
        </Reveal>

      </div>

      {/* Bottom Navigation */}
      <div className="mt-16 pt-8 border-t border-[#e7e5e4] flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/"
          className="text-xs font-mono text-[#79716b] hover:text-[#292524] transition flex items-center gap-1.5"
        >
          ← {isId ? "Kembali ke Beranda" : "Back to Home"}
        </Link>
        <Link
          href="/docs/allometry"
          className="text-xs font-mono text-[#616c39] font-semibold hover:text-[#4e572c] transition flex items-center gap-1.5"
        >
          {isId ? "Lanjut ke Metodologi Estimasi Karbon Alometrik →" : "Next: Allometric Carbon Methodology →"}
        </Link>
      </div>

    </main>
  );
}
