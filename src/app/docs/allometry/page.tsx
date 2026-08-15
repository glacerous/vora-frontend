"use client";

import React, { useState } from "react";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { useSettings } from "@/components/AuthProvider";

export default function AllometryDocPage() {
  const { language } = useSettings();
  const isId = language === "id";

  // Interactive Live Calculator State
  const [dbh, setDbh] = useState<number>(25.0);
  const [height, setHeight] = useState<number>(14.0);
  const [woodDensity, setWoodDensity] = useState<number>(0.60);

  // Pantropical Chave et al. (2005) Moist Forest equation:
  // AGB = 0.0509 * rho * (DBH^2) * H
  const agb = 0.0509 * woodDensity * Math.pow(dbh, 2) * height;
  
  // Cairns et al. (1997) Below-Ground Biomass equation:
  // BGB = exp(-1.0587 + 0.8836 * ln(AGB))
  const bgb = Math.exp(-1.0587 + 0.8836 * Math.log(Math.max(agb, 0.1)));
  
  // Total Biomass
  const totalBiomass = agb + bgb;

  // IPCC Carbon Fraction = 0.47
  const carbon = totalBiomass * 0.47;

  // CO2e = Carbon * (44/12)
  const co2e = carbon * (44 / 12);

  return (
    <main className="min-h-screen bg-[#fafaf9] text-[#292524] pt-28 sm:pt-36 pb-24 px-6 sm:px-8 max-w-[1100px] mx-auto w-full font-sans selection:bg-[#616c39]/15">
      
      {/* Breadcrumb & Eyebrow */}
      <div className="flex items-center gap-2 text-xs font-mono text-[#79716b] mb-6">
        <Link href="/" className="hover:text-[#292524] transition">
          {isId ? "Beranda" : "Home"}
        </Link>
        <span>/</span>
        <span className="text-[#616c39] font-semibold">
          {isId ? "Metodologi Alometrik" : "Allometric Methodology"}
        </span>
      </div>

      {/* Hero Title */}
      <Reveal>
        <div className="mb-12">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.10em] text-[#616c39] block mb-2">
            #02 — CARBON ACCOUNTING METHODOLOGY
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl text-[#292524] font-normal tracking-tight leading-tight max-w-3xl">
            {isId
              ? "Estimasi Karbon Alometrik Berstandar IPCC & Chave."
              : "IPCC & Chave Compliant Allometric Carbon Estimation."}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[#79716b] max-w-2xl leading-relaxed">
            {isId
              ? "Pelajari bagaimana data geometri 3D (DBH dan tinggi pohon) dikonversi secara matematis menjadi biomassa atas tanah (AGB), biomassa akar bawah tanah (BGB), dan stok ekuivalen karbon (CO₂e) yang dapat diaudit."
              : "Explore how 3D geometric telemetry (DBH and tree height) is mathematically converted into aboveground biomass (AGB), belowground root biomass (BGB), and verifiable equivalent carbon (CO₂e)."}
          </p>
        </div>
      </Reveal>

      {/* Interactive Quick Links / Action CTAs */}
      <div className="flex flex-wrap gap-3.5 mb-14">
        <Link
          href="/gallery"
          className="px-5 py-2.5 bg-[#616c39] hover:bg-[#4e572c] text-white text-xs sm:text-sm font-semibold uppercase tracking-[0.04em] rounded-lg transition-colors flex items-center gap-2 shadow-none cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
          </svg>
          {isId ? "Jelajahi Galeri Data Lapangan" : "Browse Field Data Gallery"}
        </Link>
        <Link
          href="/reconstruct"
          className="px-5 py-2.5 border border-[#e7e5e4] hover:border-[#292524] text-[#292524] text-xs sm:text-sm font-semibold uppercase tracking-[0.04em] rounded-lg transition-colors bg-white cursor-pointer"
        >
          {isId ? "Scan Video Baru" : "Scan New Video"}
        </Link>
      </div>

      {/* ── Interactive Live Formula Calculator ── */}
      <Reveal delay={0.1}>
        <div className="bg-white border border-[#e7e5e4] rounded-2xl p-6 sm:p-8 shadow-sm mb-12">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#e7e5e4]">
            <div>
              <h2 className="font-mono text-base font-semibold text-[#292524]">
                {isId ? "Simulasi Kalkulator Alometrik Interaktif" : "Interactive Live Allometric Calculator"}
              </h2>
              <p className="text-xs text-[#79716b] mt-0.5">
                {isId ? "Geser parameter untuk melihat kalkulasi biomassa dan stok karbon secara real-time." : "Adjust parameters to observe real-time biomass and carbon stock calculation."}
              </p>
            </div>
            <span className="font-mono text-[10px] text-[#616c39] bg-[#616c39]/10 px-2.5 py-1 rounded font-bold">
              LIVE FORMULA
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Sliders */}
            <div className="lg:col-span-6 space-y-5">
              
              {/* Slider 1: DBH */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-[#79716b]">{isId ? "Diameter Setinggi Dada (DBH)" : "Diameter at Breast Height (DBH)"}:</span>
                  <span className="font-bold text-[#292524]">{dbh.toFixed(1)} cm</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="0.5"
                  value={dbh}
                  onChange={(e) => setDbh(parseFloat(e.target.value))}
                  className="w-full accent-[#616c39] cursor-pointer"
                />
              </div>

              {/* Slider 2: Height */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-[#79716b]">{isId ? "Tinggi Pohon (H)" : "Tree Height (H)"}:</span>
                  <span className="font-bold text-[#292524]">{height.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="45"
                  step="0.5"
                  value={height}
                  onChange={(e) => setHeight(parseFloat(e.target.value))}
                  className="w-full accent-[#616c39] cursor-pointer"
                />
              </div>

              {/* Slider 3: Wood Density */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-[#79716b]">{isId ? "Berat Jenis Kayu (ρ)" : "Wood Density (ρ)"}:</span>
                  <span className="font-bold text-[#292524]">{woodDensity.toFixed(2)} g/cm³</span>
                </div>
                <input
                  type="range"
                  min="0.30"
                  max="0.95"
                  step="0.01"
                  value={woodDensity}
                  onChange={(e) => setWoodDensity(parseFloat(e.target.value))}
                  className="w-full accent-[#616c39] cursor-pointer"
                />
              </div>

            </div>

            {/* Right Column: Realtime Calculated Results Badge */}
            <div className="lg:col-span-6 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl p-5 space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1 border-b border-[#e7e5e4]">
                <span className="text-[#79716b]">{isId ? "Biomassa Atas Tanah (AGB)" : "Aboveground Biomass (AGB)"}:</span>
                <span className="text-[#292524] font-semibold">{agb.toFixed(2)} kg</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#e7e5e4]">
                <span className="text-[#79716b]">{isId ? "Biomassa Akar (BGB)" : "Belowground Root (BGB)"}:</span>
                <span className="text-[#292524] font-semibold">{bgb.toFixed(2)} kg</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#e7e5e4]">
                <span className="text-[#79716b]">{isId ? "Total Karbon Tersimpan (C)" : "Total Stored Carbon (C)"}:</span>
                <span className="text-[#292524] font-semibold">{carbon.toFixed(2)} kg C</span>
              </div>
              <div className="flex justify-between py-2.5 bg-[#616c39]/10 px-3.5 rounded-lg border border-[#616c39]/20 text-sm">
                <span className="text-[#616c39] font-bold">{isId ? "Setara Karbon Dioksida" : "CO₂ Equivalent"}:</span>
                <span className="text-[#616c39] font-bold">{co2e.toFixed(2)} kg CO₂e</span>
              </div>
            </div>

          </div>
        </div>
      </Reveal>

      {/* ── Mathematical Equations Breakdown ── */}
      <div className="space-y-8">
        
        {/* Equation 1 */}
        <Reveal delay={0.15}>
          <div className="bg-white border border-[#e7e5e4] rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-xl bg-[#616c39]/10 text-[#616c39] font-mono font-bold text-sm flex items-center justify-center">
                01
              </span>
              <h2 className="font-mono text-base sm:text-lg font-semibold text-[#292524]">
                {isId ? "Persamaan Biomassa Chave et al. (2005)" : "Chave et al. (2005) Biomass Equation"}
              </h2>
            </div>
            <div className="bg-[#fafaf9] p-4 rounded-xl border border-[#e7e5e4] font-mono text-sm sm:text-base text-[#292524] text-center my-4 overflow-x-auto">
              AGB = 0.0509 &times; &rho; &times; DBH<sup>2</sup> &times; H
            </div>
            <p className="text-sm text-[#79716b] leading-relaxed">
              {isId
                ? "Digunakan untuk estimasi biomassa pohon di kawasan hutan tropis lembap (tropical moist forest). Persamaan ini mengintegrasikan berat jenis kayu spesifik (&rho;) berdasarkan spesies pohon, diameter setinggi dada (DBH dalam cm), dan total tinggi pohon (H dalam m)."
                : "Widely applied for tropical moist forest biomass accounting. Integrates species-specific wood density (&rho;), breast-height diameter (DBH in cm), and total tree height (H in meters)."}
            </p>
          </div>
        </Reveal>

        {/* Equation 2 */}
        <Reveal delay={0.2}>
          <div className="bg-white border border-[#e7e5e4] rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-xl bg-[#616c39]/10 text-[#616c39] font-mono font-bold text-sm flex items-center justify-center">
                02
              </span>
              <h2 className="font-mono text-base sm:text-lg font-semibold text-[#292524]">
                {isId ? "Rasio Alometrik Akar Bawah Tanah (Cairns et al. 1997)" : "Belowground Root Ratio (Cairns et al. 1997)"}
              </h2>
            </div>
            <div className="bg-[#fafaf9] p-4 rounded-xl border border-[#e7e5e4] font-mono text-sm sm:text-base text-[#292524] text-center my-4 overflow-x-auto">
              BGB = exp(-1.0587 + 0.8836 &times; ln(AGB))
            </div>
            <p className="text-sm text-[#79716b] leading-relaxed">
              {isId
                ? "Biomassa sistem perakaran pohon (Below-Ground Biomass) dihitung menggunakan hubungan alometrik non-linear empiris Cairns untuk memastikan penghitungan cadangan karbon pohon yang holistik dan akuntabel."
                : "Subterranean root biomass is estimated via Cairns' empirical non-linear allometric relationship, ensuring auditable and comprehensive tree carbon accounting."}
            </p>
          </div>
        </Reveal>

        {/* Equation 3 */}
        <Reveal delay={0.25}>
          <div className="bg-white border border-[#e7e5e4] rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-xl bg-[#616c39]/10 text-[#616c39] font-mono font-bold text-sm flex items-center justify-center">
                03
              </span>
              <h2 className="font-mono text-base sm:text-lg font-semibold text-[#292524]">
                {isId ? "Konversi Fraksi Karbon IPCC & Ekuivalen CO₂" : "IPCC Carbon Fraction & CO₂ Equivalent Conversion"}
              </h2>
            </div>
            <div className="bg-[#fafaf9] p-4 rounded-xl border border-[#e7e5e4] font-mono text-sm sm:text-base text-[#292524] text-center my-4 overflow-x-auto">
              CO&#8322;e = (AGB + BGB) &times; 0.47 &times; (44 / 12)
            </div>
            <p className="text-sm text-[#79716b] leading-relaxed">
              {isId
                ? "Sesuai pedoman IPCC Tier-1, fraksi karbon dari biomassa kering kayu adalah 47% (0,47). Nilai total karbon kemudian dikonversi menjadi ton/kg setara CO₂ (CO₂e) menggunakan rasio massa molekul gas karbon dioksida terhadap atom karbon (44/12 &approx; 3,6667)."
                : "Per IPCC Tier-1 forestry guidelines, dry wood biomass contains 47% carbon (0.47). Total carbon stock is converted to CO₂ equivalent using the molecular-to-atomic mass ratio of carbon dioxide to carbon (44/12 &approx; 3.6667)."}
            </p>
          </div>
        </Reveal>

      </div>

      {/* Bottom Navigation */}
      <div className="mt-16 pt-8 border-t border-[#e7e5e4] flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/docs/pipeline"
          className="text-xs font-mono text-[#79716b] hover:text-[#292524] transition flex items-center gap-1.5"
        >
          ← {isId ? "Kembali ke Metodologi 3D Splatting" : "Back to 3D Splatting Pipeline"}
        </Link>
        <Link
          href="/gallery"
          className="text-xs font-mono text-[#616c39] font-semibold hover:text-[#4e572c] transition flex items-center gap-1.5"
        >
          {isId ? "Lihat Hasil Scan di Galeri →" : "View Scan Results in Gallery →"}
        </Link>
      </div>

    </main>
  );
}
