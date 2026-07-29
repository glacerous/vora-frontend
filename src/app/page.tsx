"use client";

import React from "react";
import Link from "next/link";
import BoomerangVideoBg from "@/components/BoomerangVideoBg";
import Reveal from "@/components/Reveal";

// Custom SVG Logo Mark
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

// Custom SVG ArrowRight
const ArrowRight = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-4 h-4 text-gray-400 group-hover:text-gray-700 group-hover:translate-x-0.5 transition-all duration-200"
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export default function Home() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden flex flex-col font-sans">
      
      {/* ── Fixed navbar ────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 sm:px-10 md:px-14 py-4 sm:py-5 flex justify-between items-center bg-white/90 backdrop-blur-sm border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2.5 cursor-pointer">
          <LogoMark />
          <span className="font-semibold text-base tracking-tight text-[#191919]">
            Vora
          </span>
        </Link>

        {/* Center links (hidden below md) */}
        <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          <Link href="/" className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200">
            Home
          </Link>
          <Link href="/history" className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200">
            Gallery
          </Link>
        </div>
      </nav>

      {/* ── Section 1: Hero Landing Fold ─────────────────────────────────── */}
      <section className="relative flex flex-col items-center overflow-hidden min-h-screen z-10 select-none pb-16 sm:pb-24">
        {/* Boomerang looping video background (scaled 100%, zoomed out building) */}
        <BoomerangVideoBg />
        {/* Soft radial white overlay to keep typography readable and clean */}
        <div
          className="absolute inset-0 pointer-events-none z-1"
          style={{
            background: "radial-gradient(circle at center, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.1) 60%, rgba(255, 255, 255, 0) 100%)",
          }}
        />
        {/* Bottom linear white fade to blend the video seamlessly into the next white section */}
        <div
          className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none z-1"
          style={{
            background: "linear-gradient(to top, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.5) 50%, rgba(255, 255, 255, 0) 100%)",
          }}
        />

        {/* Content Overlay */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-between">
          
          {/* Hero copy block */}
          <div className="pt-28 sm:pt-32 md:pt-36 lg:pt-40 px-4 sm:px-6 flex flex-col items-center text-center">
            <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.1] tracking-tighter text-[#191919] font-normal">
              Measure forest <br className="hidden sm:inline" /> carbon.
            </h1>
            <p className="max-w-sm sm:max-w-md mt-5 sm:mt-6 md:mt-8 text-sm md:text-base text-[#191919]/70 leading-relaxed">
              3D Gaussian Splatting and carbon metrics estimation for environmental conservation. Reconstruct high-fidelity tree models, measure DBH, and estimate forest carbon storage from your browser.
            </p>
            
            <div className="flex gap-4 mt-6 sm:mt-8 md:mt-10">
              <Link
                href="/reconstruct"
                className="px-8 py-3.5 bg-[#191919] text-white text-sm font-medium rounded-lg hover:bg-[#191919]/90 transition-colors duration-200 shadow-md"
              >
                Start Analyzing
              </Link>
              <Link
                href="/example"
                className="px-8 py-3.5 bg-[#F4F3F3] hover:bg-[#eaeaea] text-[#191919] text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm border border-slate-200"
              >
                View Example Scan
              </Link>
            </div>
          </div>

          {/* Bottom info panel (Floating Card) */}
          <Reveal y={20} delay={0.1} className="w-full max-w-5xl px-4 sm:px-6 mt-28 sm:mt-36 md:mt-44 mb-16">
            <div className="bg-white/95 backdrop-blur-sm border border-gray-200 pt-8 sm:pt-10 md:pt-12 px-6 sm:px-8 md:px-12 pb-8 shadow-md rounded-3xl">
              
              {/* Row 1 — 2 cols */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-16 items-end pb-6 sm:pb-8">
                <div>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[#191919]/50 font-medium">
                    WHAT DO WE DO?
                  </span>
                  <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl font-serif font-normal leading-tight tracking-tight text-[#191919]">
                    Scans that <br className="hidden sm:inline" /> calculate impact.
                  </h2>
                </div>
                <p className="text-sm md:text-[15px] text-[#191919]/70 leading-relaxed">
                  AI-powered tree reconstruction built for researchers and conservationists. Models that capture every branch, estimate DBH, and calculate total stored carbon instantly.
                </p>
              </div>

              {/* Hairline divider */}
              <div className="h-px bg-gray-200 w-full" />

              {/* Row 2 — 3 interactive rows */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-4">
                
                <Link
                  href="/reconstruct"
                  className="group bg-[#F4F3F3] hover:bg-[#eaeaea] transition-all duration-200 cursor-pointer px-4 sm:px-6 py-3.5 sm:py-4 flex justify-between items-center rounded-xl"
                >
                  <div className="text-sm text-[#191919] flex items-center">
                    <span className="text-[#191919]/40 text-xs">01</span>
                    <span className="mx-2 text-[#191919]/30 text-xs">/</span>
                    <span className="font-medium">Reconstruct</span>
                  </div>
                  <ArrowRight />
                </Link>

                <Link
                  href="/example"
                  className="group bg-[#F4F3F3] hover:bg-[#eaeaea] transition-all duration-200 cursor-pointer px-4 sm:px-6 py-3.5 sm:py-4 flex justify-between items-center rounded-xl"
                >
                  <div className="text-sm text-[#191919] flex items-center">
                    <span className="text-[#191919]/40 text-xs">02</span>
                    <span className="mx-2 text-[#191919]/30 text-xs">/</span>
                    <span className="font-medium">Analyze Example</span>
                  </div>
                  <ArrowRight />
                </Link>

                <Link
                  href="/estimator"
                  className="group bg-[#F4F3F3] hover:bg-[#eaeaea] transition-all duration-200 cursor-pointer px-4 sm:px-6 py-3.5 sm:py-4 flex justify-between items-center rounded-xl"
                >
                  <div className="text-sm text-[#191919] flex items-center">
                    <span className="text-[#191919]/40 text-xs">03</span>
                    <span className="mx-2 text-[#191919]/30 text-xs">/</span>
                    <span className="font-medium">Verify</span>
                  </div>
                  <ArrowRight />
                </Link>

              </div>

            </div>
          </Reveal>

        </div>
      </section>

      {/* ── Section 2: How Vora Works ────────────────────────────────────── */}
      <section id="product" className="bg-white py-24 px-6 sm:px-10 md:px-14 border-t border-slate-100 z-20 relative">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#191919]/50 font-medium block mb-4">
              WORKFLOW WALKTHROUGH
            </span>
            <h2 className="text-4xl sm:text-5xl font-serif font-normal tracking-tight text-[#191919] mb-16 leading-tight">
              Three steps to <br className="sm:hidden" /> compute carbon.
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 sm:gap-16">
            
            {/* Step 1 */}
            <Reveal delay={0.06} className="flex flex-col gap-5 border-t border-slate-200 pt-8">
              <span className="font-serif text-3xl text-[#191919]/30">01</span>
              <h3 className="text-lg font-semibold text-[#191919] tracking-tight">Reconstruct the Forest</h3>
              <p className="text-sm text-[#191919]/70 leading-relaxed">
                Record or upload drone imagery of target forest zones. Our pipeline maps coordinates and performs AI-driven 3D Gaussian Splatting of trees.
              </p>
            </Reveal>

            {/* Step 2 */}
            <Reveal delay={0.12} className="flex flex-col gap-5 border-t border-slate-200 pt-8">
              <span className="font-serif text-3xl text-[#191919]/30">02</span>
              <h3 className="text-lg font-semibold text-[#191919] tracking-tight">Analyze Splat Geometry</h3>
              <p className="text-sm text-[#191919]/70 leading-relaxed">
                Interact with the detailed 3D model in real time. Inspect specific tree trunks, crowns, and branch arrangements from any angle directly in your browser.
              </p>
            </Reveal>

            {/* Step 3 */}
            <Reveal delay={0.18} className="flex flex-col gap-5 border-t border-slate-200 pt-8">
              <span className="font-serif text-3xl text-[#191919]/30">03</span>
              <h3 className="text-lg font-semibold text-[#191919] tracking-tight">Estimate Biomass & CO2e</h3>
              <p className="text-sm text-[#191919]/70 leading-relaxed">
                Obtain instant estimations of Trunk Diameter (DBH), Tree Height, Biomass weight, Carbon content, and total CO2 equivalents stored.
              </p>
            </Reveal>

          </div>

          <Reveal delay={0.24} className="mt-16 pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <h4 className="text-sm font-semibold text-[#191919]">Ready to see visual carbon tracking in action?</h4>
              <p className="text-xs text-[#191919]/60 mt-1">Access the live estimator tool or view a pre-calculated model.</p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/estimator"
                className="px-6 py-3 bg-[#191919] text-white text-xs font-medium rounded-lg hover:bg-[#191919]/90 transition shadow-sm"
              >
                Open Estimator
              </Link>
              <Link
                href="/example"
                className="px-6 py-3 bg-[#F4F3F3] hover:bg-[#eaeaea] text-[#191919] text-xs font-medium rounded-lg transition border border-slate-200"
              >
                Load Example Scan
              </Link>
            </div>
          </Reveal>

        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#191919] border-t border-[#191919] py-12 px-6 sm:px-10 text-center z-20">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/50">
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
