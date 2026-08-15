"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, useSettings } from "@/components/AuthProvider";

// Arrow icon for card footers and buttons
const ArrowRight = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useSettings();
  // SaaS Drag-and-Drop animation sequence: 0 = Dragging from Tree to Terminal, 1 = Processing/Extracted
  const [animStep, setAnimStep] = useState(0);

  useEffect(() => {
    // 4.6s drag flight, then 3.6s active extraction telemetry display
    const timer = setInterval(() => {
      setAnimStep((prev) => (prev === 0 ? 1 : 0));
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafaf9] text-[#292524] flex flex-col font-sans selection:bg-[#616c39]/15 selection:text-[#292524]">

      {/* ── Section 1: Hero Section ────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center pt-32 sm:pt-40 md:pt-44 pb-20 px-6 sm:px-8 max-w-[1200px] mx-auto w-full text-center">
        
        {/* Hero Headline (Cooper/Lora Serif with italic emphasis word) */}
        <Reveal delay={0.1}>
          <h1 className="font-serif text-5xl sm:text-7xl md:text-8xl leading-[1.1] sm:leading-[1.08] tracking-tight text-[#292524] font-normal max-w-4xl mx-auto">
            {language === "id" ? (
              <>
                Ukur karbon <br className="hidden sm:inline" />
                <span className="italic font-normal">pohon.</span>
              </>
            ) : (
              <>
                Measure forest <br className="hidden sm:inline" />
                <span className="italic font-normal">carbon.</span>
              </>
            )}
          </h1>
        </Reveal>

        {/* Subheading */}
        <Reveal delay={0.18}>
          <p className="mt-6 sm:mt-8 text-base sm:text-lg md:text-[18px] text-[#79716b] leading-relaxed max-w-2xl mx-auto font-normal">
            {t("hero.subtitle")}
          </p>
        </Reveal>

        {/* CTA Section */}
        <Reveal delay={0.24}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-8 sm:mt-10 w-full sm:w-auto">
            {/* Show Sign Up / Daftar button only if NOT logged in */}
            {!authLoading && !user && (
              <Link
                href="/register"
                className="w-full sm:w-auto px-6 py-3 border border-[#e7e5e4] hover:border-[#292524] text-[#292524] text-xs sm:text-sm font-semibold uppercase tracking-[0.04em] rounded-lg transition-colors duration-150 text-center bg-transparent"
              >
                {t("nav.register")}
              </Link>
            )}

            {/* Primary Filled Button (Mulai Analisis) - Centered when user is logged in */}
            <Link
              href="/reconstruct"
              className="w-full sm:w-auto px-6 py-3 bg-[#616c39] hover:bg-[#4e572c] text-white text-xs sm:text-sm font-semibold uppercase tracking-[0.04em] rounded-lg transition-colors duration-150 text-center flex items-center justify-center gap-2 shadow-none"
            >
              {t("hero.startAnalyzing")}
              <ArrowRight />
            </Link>
          </div>
        </Reveal>

        {/* ── Product Showcase Card with Pixel Art Forest ── */}
        <Reveal y={30} delay={0.3} className="w-full mt-16 sm:mt-20">
          <div className="relative rounded-2xl bg-[#ffffff] border border-[#e7e5e4] overflow-hidden shadow-[0_20px_25px_-5px_rgba(0,0,0,0.08),0_8px_10px_-6px_rgba(0,0,0,0.04)] text-left">
            
            {/* Showcase Visual Area with Full-Bleed Pixel Art Forest */}
            <div className="relative h-[380px] sm:h-[490px] md:h-[570px] w-full overflow-hidden flex items-center justify-center">
              
              {/* Pixel Art Forest Background Image (Masterpiece 32-bit Art) */}
              <Image
                src="/forest_pixel_master.jpg"
                alt="Masterpiece Pixel Art Forest Landscape"
                fill
                priority
                className="object-cover object-center"
                style={{ imageRendering: "pixelated" }}
              />

              {/* Central Floating 3D Tree Scan Terminal */}
              <div className="relative z-10 w-full max-w-lg mx-6 sm:mx-8">
                <div className="bg-[#ffffff]/98 backdrop-blur-md rounded-2xl p-5 sm:p-6 shadow-[0_20px_45px_-5px_rgba(0,0,0,0.22)] border border-[#e7e5e4] text-left relative">
                  
                  {/* Terminal Header */}
                  <div className="flex items-center justify-between pb-3.5 border-b border-[#e7e5e4]">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#616c39]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                      </svg>
                      <span className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-[#292524]">
                        {t("showcase.terminalTitle")}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-[#79716b] bg-[#fafaf9] border border-[#e7e5e4] px-2 py-0.5 rounded">
                      {t("showcase.version")}
                    </span>
                  </div>

                  {/* Dropzone Container */}
                  <div className="relative mt-4">
                    <Link
                      href="/reconstruct"
                      className={"block p-4 rounded-xl border transition-all duration-300 relative " + (animStep === 1 ? "border-[#616c39]/70 bg-[#fafaf9]" : "border-dashed border-[#e7e5e4] bg-[#fafaf9] hover:border-[#616c39]")}
                    >
                      <AnimatePresence mode="wait">
                        {animStep === 0 ? (
                          /* Initial State */
                          <motion.div
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-3.5"
                          >
                            <div className="w-10 h-10 rounded-lg bg-[#ffffff] border border-[#e7e5e4] flex items-center justify-center text-[#79716b] transition-colors shrink-0">
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                              </svg>
                            </div>
                            <div className="text-left">
                              <span className="block font-sans text-xs sm:text-sm font-medium text-[#292524]">
                                {t("showcase.idlePrompt")}
                              </span>
                              <span className="block font-mono text-[11px] text-[#79716b] mt-0.5">
                                {t("showcase.idleSub")}
                              </span>
                            </div>
                          </motion.div>
                        ) : (
                          /* Active Processing State */
                          <motion.div
                            key="active"
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="flex flex-col gap-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-[#616c39] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                                  ✓
                                </div>
                                <span className="font-mono text-xs font-semibold text-[#292524]">
                                  pohon_scan_360.mp4
                                </span>
                                <span className="font-mono text-[10px] text-[#79716b]">
                                  (48.2 MB)
                                </span>
                              </div>

                              <span className="font-mono text-[10px] text-[#616c39] font-semibold bg-[#616c39]/10 px-2 py-0.5 rounded">
                                {t("showcase.readyBadge")}
                              </span>
                            </div>

                            {/* Animated Progress Bar */}
                            <div className="w-full bg-[#e7e5e4] h-1.5 rounded-full overflow-hidden">
                              <motion.div
                                className="bg-[#616c39] h-full rounded-full"
                                initial={{ width: "20%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 1.4, ease: "easeInOut" }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[11px] font-mono text-[#79716b]">
                              <span>{t("showcase.groundCalib")}</span>
                              <span className="text-[#292524] font-semibold">DBH: 13.69 cm &middot; CO₂e: 17.96 kg</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Link>
                  </div>

                </div>
              </div>

              {/* Tree Origin Video Target Reticle (High-Visibility White Grid on Left Tree) */}
              <AnimatePresence>
                {animStep === 0 && (
                  <motion.div
                    key="tree-reticle"
                    className="absolute z-20 pointer-events-none -translate-x-[340px] translate-y-[10px]"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.3 } }}
                    transition={{ duration: 0.4 }}
                  >
                    {/* Bounding Video Brackets in High-Visibility White */}
                    <div className="w-24 h-36 border-2 border-dashed border-white/95 rounded-xl bg-white/15 backdrop-blur-2xs flex flex-col justify-between p-1.5 shadow-[0_0_20px_rgba(255,255,255,0.45)]">
                      <div className="flex justify-between items-center text-[9px] font-mono text-[#0c0a09] bg-white px-1.5 py-0.5 rounded font-bold shadow-xs">
                        <span>scan_360.mp4</span>
                      </div>
                      <div className="text-[8px] font-mono text-[#0c0a09] bg-white px-1.5 py-0.5 rounded text-center font-bold shadow-xs">
                        48.2 MB &middot; 00:42
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Single Continuous Gliding Arc (Zero Stutters or Sub-Pauses) */}
              <AnimatePresence>
                {animStep === 0 && (
                  <motion.div
                    key="cursor-tree-drag"
                    className="absolute z-30 pointer-events-none"
                    initial={{ x: -340, y: 10, opacity: 1, scale: 0.95 }}
                    animate={{
                      x: [-340, -340, -170, 0],
                      y: [10, 10, 4, 18],
                      rotate: [0, 0, 1.5, 0],
                      scale: [0.95, 1, 1.02, 0.94],
                      opacity: 1,
                    }}
                    exit={{ opacity: 0, y: 26, scale: 0.8, transition: { duration: 0.35, ease: "easeIn" } }}
                    transition={{
                      duration: 3.8,
                      times: [0, 0.15, 0.6, 1],
                      ease: [0.35, 0.1, 0.25, 1],
                    }}
                  >
                    {/* OS Cursor Icon */}
                    <svg
                      className="w-7 h-7 drop-shadow-2xl text-[#0c0a09] relative z-10"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      stroke="#ffffff"
                      strokeWidth="1.2"
                    >
                      <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.45 0 .67-.54.35-.85L6.35 2.85a.5.5 0 0 0-.85.36z" />
                    </svg>

                    {/* Dragged Video Entity Card */}
                    <div className="absolute top-4 left-4 bg-[#1c1917]/95 backdrop-blur-md text-white text-[11px] font-mono font-medium px-3 py-2 rounded-xl shadow-[0_15px_30px_rgba(0,0,0,0.35)] flex items-center gap-2.5 border border-white/20 whitespace-nowrap">
                      <div className="w-7 h-7 rounded-lg bg-[#616c39]/30 border border-[#616c39] flex items-center justify-center text-white shadow-inner shrink-0">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m15 10 5-3v10l-5-3" />
                          <rect width="13" height="12" x="2" y="6" rx="2" />
                        </svg>
                      </div>
                      <div className="text-left flex flex-col">
                        <span className="font-semibold text-white tracking-tight">
                          pohon_scan_360.mp4
                        </span>
                        <span className="text-[#a8a29e] text-[10px] font-mono">
                          48.2 MB &middot; 00:42 &middot; 4K 60fps
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* Bottom 3-Column Grid Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#e7e5e4] border-t border-[#e7e5e4] bg-[#ffffff]">
              
              {/* Sub-Card 1 */}
              <div className="p-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-mono text-sm font-semibold text-[#292524] mb-2 tracking-tight">
                    {t("subcard.splat.title")}
                  </h3>
                  <p className="font-sans text-xs sm:text-sm text-[#79716b] leading-[1.43]">
                    {t("subcard.splat.desc")}
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-[#e7e5e4] flex items-center justify-between text-xs font-mono text-[#292524]">
                  <Link href="/docs/pipeline" className="uppercase tracking-[0.04em] hover:opacity-60 transition flex items-center gap-1">
                    {t("subcard.docs")} <span className="text-[10px]">↗</span>
                  </Link>
                </div>
              </div>

              {/* Sub-Card 2 */}
              <div className="p-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-mono text-sm font-semibold text-[#292524] mb-2 tracking-tight">
                    {t("subcard.ransac.title")}
                  </h3>
                  <p className="font-sans text-xs sm:text-sm text-[#79716b] leading-[1.43]">
                    {t("subcard.ransac.desc")}
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-[#e7e5e4] flex items-center justify-between text-xs font-mono text-[#292524]">
                  <Link href="/reconstruct" className="uppercase tracking-[0.04em] hover:opacity-60 transition flex items-center gap-1">
                    {t("subcard.docs")} <span className="text-[10px]">↗</span>
                  </Link>
                </div>
              </div>

              {/* Sub-Card 3 */}
              <div className="p-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-mono text-sm font-semibold text-[#292524] mb-2 tracking-tight">
                    {t("subcard.allometric.title")}
                  </h3>
                  <p className="font-sans text-xs sm:text-sm text-[#79716b] leading-[1.43]">
                    {t("subcard.allometric.desc")}
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-[#e7e5e4] flex items-center justify-between text-xs font-mono text-[#292524]">
                  <Link href="/docs/allometry" className="uppercase tracking-[0.04em] hover:opacity-60 transition flex items-center gap-1">
                    {t("subcard.docs")} <span className="text-[10px]">↗</span>
                  </Link>
                </div>
              </div>

            </div>

          </div>
        </Reveal>

      </section>

      {/* ── Section 2: Stats Bar ───────────────────────────────────────────── */}
      <section className="w-full bg-[#ffffff] border-y border-[#e7e5e4] py-8 px-6 sm:px-8">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x md:divide-[#e7e5e4]">
          
          <div className="flex flex-col items-center text-center px-4">
            <span className="font-mono text-2xl sm:text-3xl text-[#292524] font-medium tracking-tight">
              {t("stats.timeValue")}
            </span>
            <span className="font-sans text-xs text-[#79716b] mt-1 font-normal">
              {t("stats.timeLabel")}
            </span>
          </div>

          <div className="flex flex-col items-center text-center px-4">
            <span className="font-mono text-2xl sm:text-3xl text-[#292524] font-medium tracking-tight">
              {t("stats.framesValue")}
            </span>
            <span className="font-sans text-xs text-[#79716b] mt-1 font-normal">
              {t("stats.framesLabel")}
            </span>
          </div>

          <div className="flex flex-col items-center text-center px-4">
            <span className="font-mono text-2xl sm:text-3xl text-[#292524] font-medium tracking-tight">
              {t("stats.accuracyValue")}
            </span>
            <span className="font-sans text-xs text-[#79716b] mt-1 font-normal">
              {t("stats.accuracyLabel")}
            </span>
          </div>

          <div className="flex flex-col items-center text-center px-4">
            <span className="font-mono text-2xl sm:text-3xl text-[#616c39] font-medium tracking-tight">
              {t("stats.webglValue")}
            </span>
            <span className="font-sans text-xs text-[#79716b] mt-1 font-normal">
              {t("stats.webglLabel")}
            </span>
          </div>

        </div>
      </section>

      {/* ── Section 3: Deep Dive Feature #01 (3D Gaussian Splatting) ─────── */}
      <section className="py-20 sm:py-28 px-6 sm:px-8 max-w-[1200px] mx-auto w-full">
        <Reveal>
          <div className="mb-10 text-left">
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.10em] text-[#616c39] block mb-2">
              {t("feat1.eyebrow")}
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#292524] font-normal tracking-tight max-w-2xl leading-tight">
              {t("feat1.title")}
            </h2>
          </div>
        </Reveal>

        {/* 2-Column Split Component Card */}
        <Reveal delay={0.1}>
          <div className="bg-[#ffffff] border border-[#e7e5e4] rounded-2xl p-6 sm:p-10 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.06)] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: 3 Structured Feature Items */}
            <div className="lg:col-span-5 flex flex-col gap-6 text-left">
              
              {/* Item 1 */}
              <div className="pl-4 border-l-2 border-[#616c39] flex flex-col">
                <h3 className="font-mono text-xs uppercase font-semibold text-[#292524] tracking-[0.06em] mb-1">
                  {t("feat1.item1.title")}
                </h3>
                <p className="font-sans text-xs sm:text-sm text-[#79716b] leading-relaxed">
                  {t("feat1.item1.desc")}
                </p>
              </div>

              {/* Item 2 */}
              <div className="pl-4 border-l-2 border-[#e7e5e4] hover:border-[#79716b] transition flex flex-col">
                <h3 className="font-mono text-xs uppercase font-semibold text-[#292524] tracking-[0.06em] mb-1">
                  {t("feat1.item2.title")}
                </h3>
                <p className="font-sans text-xs sm:text-sm text-[#79716b] leading-relaxed">
                  {t("feat1.item2.desc")}
                </p>
              </div>

              {/* Item 3 */}
              <div className="pl-4 border-l-2 border-[#e7e5e4] hover:border-[#79716b] transition flex flex-col">
                <h3 className="font-mono text-xs uppercase font-semibold text-[#292524] tracking-[0.06em] mb-1">
                  {t("feat1.item3.title")}
                </h3>
                <p className="font-sans text-xs sm:text-sm text-[#79716b] leading-relaxed">
                  {t("feat1.item3.desc")}
                </p>
              </div>

            </div>

            {/* Right Column: Visual Pipeline Window Mockup */}
            <div className="lg:col-span-7 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl p-5 sm:p-6 shadow-inner">
              
              {/* Window Bar */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#e7e5e4]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e7e5e4]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e7e5e4]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e7e5e4]" />
                </div>
                <span className="font-mono text-[11px] text-[#79716b] uppercase tracking-wider">
                  alur_rekonstruksi.json
                </span>
              </div>

              {/* Flowchart / Node Cards */}
              <div className="flex flex-col gap-3 font-mono text-xs">
                
                {/* Node 1 */}
                <div className="bg-[#ffffff] border border-[#e7e5e4] p-3.5 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-md bg-[#616c39]/10 text-[#616c39] flex items-center justify-center font-bold text-[11px]">01</span>
                    <div>
                      <span className="block font-semibold text-[#292524]">{t("feat1.node1.title")}</span>
                      <span className="text-[11px] text-[#79716b]">{t("feat1.node1.sub")}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#616c39] font-semibold bg-[#616c39]/10 px-2 py-0.5 rounded">
                    {t("feat1.node1.badge")}
                  </span>
                </div>

                {/* Arrow */}
                <div className="flex justify-center text-[#79716b] text-xs">↓</div>

                {/* Node 2 */}
                <div className="bg-[#ffffff] border border-[#e7e5e4] p-3.5 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-md bg-[#d97757]/10 text-[#d97757] flex items-center justify-center font-bold text-[11px]">02</span>
                    <div>
                      <span className="block font-semibold text-[#292524]">{t("feat1.node2.title")}</span>
                      <span className="text-[11px] text-[#79716b]">{t("feat1.node2.sub")}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#616c39] font-semibold bg-[#616c39]/10 px-2 py-0.5 rounded">
                    {t("feat1.node2.badge")}
                  </span>
                </div>

                {/* Arrow */}
                <div className="flex justify-center text-[#79716b] text-xs">↓</div>

                {/* Node 3 */}
                <div className="bg-[#ffffff] border border-[#e7e5e4] p-3.5 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-md bg-[#616c39]/10 text-[#616c39] flex items-center justify-center font-bold text-[11px]">03</span>
                    <div>
                      <span className="block font-semibold text-[#292524]">{t("feat1.node3.title")}</span>
                      <span className="text-[11px] text-[#79716b]">{t("feat1.node3.sub")}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#616c39] font-semibold bg-[#616c39]/10 px-2 py-0.5 rounded">
                    {t("feat1.node3.badge")}
                  </span>
                </div>

              </div>

            </div>

          </div>
        </Reveal>

        {/* Section Footer Link */}
        <div className="mt-8 text-center">
          <Link
            href="/docs/pipeline" className="font-mono text-xs uppercase tracking-[0.06em] text-[#616c39] hover:text-[#4e572c] font-semibold inline-flex items-center gap-1.5 transition"
          >
            {t("feat1.link")}
          </Link>
        </div>
      </section>

      {/* ── Section 4: Deep Dive Feature #02 (Forest Carbon Auditing) ─────── */}
      <section className="py-16 sm:py-24 px-6 sm:px-8 border-t border-[#e7e5e4] bg-[#ffffff] max-w-[1200px] mx-auto w-full">
        <Reveal>
          <div className="mb-10 text-left">
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.10em] text-[#616c39] block mb-2">
              {t("feat2.eyebrow")}
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#292524] font-normal tracking-tight max-w-2xl leading-tight">
              {t("feat2.title")}
            </h2>
          </div>
        </Reveal>

        {/* 2-Column Split Component Card */}
        <Reveal delay={0.1}>
          <div className="bg-[#fafaf9] border border-[#e7e5e4] rounded-2xl p-6 sm:p-10 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.06)] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Audit Certificate Window Mockup */}
            <div className="lg:col-span-7 bg-[#ffffff] border border-[#e7e5e4] rounded-xl p-5 sm:p-6 shadow-sm">
              
              {/* Window Header */}
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#e7e5e4]">
                <span className="font-mono text-xs font-bold text-[#292524] uppercase tracking-wider">
                  {t("feat2.cert.title")}
                </span>
                <span className="font-mono text-[10px] text-[#616c39] font-semibold bg-[#616c39]/10 px-2.5 py-1 rounded">
                  {t("feat2.cert.badge")}
                </span>
              </div>

              {/* Data Table / Metrics */}
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#e7e5e4]/60">
                  <span className="text-[#79716b]">{t("feat2.cert.species")}</span>
                  <span className="text-[#292524] font-semibold">Firmiana simplex (87.4%)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#e7e5e4]/60">
                  <span className="text-[#79716b]">{t("feat2.cert.dbh")}</span>
                  <span className="text-[#292524] font-semibold">13.69 cm</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#e7e5e4]/60">
                  <span className="text-[#79716b]">{t("feat2.cert.agb")}</span>
                  <span className="text-[#292524] font-semibold">8.26 kg</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#e7e5e4]/60">
                  <span className="text-[#79716b]">{t("feat2.cert.c")}</span>
                  <span className="text-[#292524] font-semibold">4.89 kg</span>
                </div>
                <div className="flex justify-between py-2 bg-[#616c39]/5 px-3 rounded-lg border border-[#616c39]/20">
                  <span className="text-[#616c39] font-bold">{t("feat2.cert.co2e")}</span>
                  <span className="text-[#616c39] font-bold text-sm">17.96 kg CO₂e</span>
                </div>
              </div>

            </div>

            {/* Right Column: 3 Structured Capabilities */}
            <div className="lg:col-span-5 flex flex-col gap-6 text-left">
              
              {/* Item 1 */}
              <div className="pl-4 border-l-2 border-[#616c39] flex flex-col">
                <h3 className="font-mono text-xs uppercase font-semibold text-[#292524] tracking-[0.06em] mb-1">
                  {t("feat2.item1.title")}
                </h3>
                <p className="font-sans text-xs sm:text-sm text-[#79716b] leading-relaxed">
                  {t("feat2.item1.desc")}
                </p>
              </div>

              {/* Item 2 */}
              <div className="pl-4 border-l-2 border-[#e7e5e4] hover:border-[#79716b] transition flex flex-col">
                <h3 className="font-mono text-xs uppercase font-semibold text-[#292524] tracking-[0.06em] mb-1">
                  {t("feat2.item2.title")}
                </h3>
                <p className="font-sans text-xs sm:text-sm text-[#79716b] leading-relaxed">
                  {t("feat2.item2.desc")}
                </p>
              </div>

              {/* Item 3 */}
              <div className="pl-4 border-l-2 border-[#e7e5e4] hover:border-[#79716b] transition flex flex-col">
                <h3 className="font-mono text-xs uppercase font-semibold text-[#292524] tracking-[0.06em] mb-1">
                  {t("feat2.item3.title")}
                </h3>
                <p className="font-sans text-xs sm:text-sm text-[#79716b] leading-relaxed">
                  {t("feat2.item3.desc")}
                </p>
              </div>

            </div>

          </div>
        </Reveal>

        {/* Section Footer Link */}
        <div className="mt-8 text-center">
          <Link
            href="/docs/allometry" className="font-mono text-xs uppercase tracking-[0.06em] text-[#616c39] hover:text-[#4e572c] font-semibold inline-flex items-center gap-1.5 transition"
          >
            {t("feat2.link")}
          </Link>
        </div>
      </section>

      {/* ── Section 5: Workflow Walkthrough ────────────────────────────────── */}
      <section className="py-20 px-6 sm:px-8 border-t border-[#e7e5e4] bg-[#fafaf9] max-w-[1200px] mx-auto w-full">
        <div className="mb-12 text-left">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.10em] text-[#79716b] block mb-2">
            {t("workflow.eyebrow")}
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#292524] font-normal tracking-tight">
            {t("workflow.title")}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          
          {/* Step 1 */}
          <div className="border-t border-[#e7e5e4] pt-6 flex flex-col justify-between">
            <div>
              <span className="font-mono text-2xl text-[#79716b]/40 font-medium block mb-3">01</span>
              <h3 className="font-sans text-base font-semibold text-[#292524] mb-2">
                {t("workflow.step1.title")}
              </h3>
              <p className="font-sans text-sm text-[#79716b] leading-relaxed">
                {t("workflow.step1.desc")}
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="border-t border-[#e7e5e4] pt-6 flex flex-col justify-between">
            <div>
              <span className="font-mono text-2xl text-[#79716b]/40 font-medium block mb-3">02</span>
              <h3 className="font-sans text-base font-semibold text-[#292524] mb-2">
                {t("workflow.step2.title")}
              </h3>
              <p className="font-sans text-sm text-[#79716b] leading-relaxed">
                {t("workflow.step2.desc")}
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="border-t border-[#e7e5e4] pt-6 flex flex-col justify-between">
            <div>
              <span className="font-mono text-2xl text-[#79716b]/40 font-medium block mb-3">03</span>
              <h3 className="font-sans text-base font-semibold text-[#292524] mb-2">
                {t("workflow.step3.title")}
              </h3>
              <p className="font-sans text-sm text-[#79716b] leading-relaxed">
                {t("workflow.step3.desc")}
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── Section 6: Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-[#e7e5e4] bg-[#fafaf9] py-12 px-6 sm:px-8">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-6 text-xs text-[#79716b]">
          <div className="flex items-center gap-3">
            <span className="font-mono font-semibold text-[#292524] tracking-tight">VORA</span>
            <span>&middot;</span>
            <p>{t("footer.rights")}</p>
          </div>
          <div className="flex flex-wrap gap-6 font-mono text-xs">
            <Link href="/" className="hover:text-[#292524] transition">{t("footer.home")}</Link>
            <Link href="/reconstruct" className="hover:text-[#292524] transition">{t("footer.newScan")}</Link>
            <Link href="/gallery" className="hover:text-[#292524] transition">{t("footer.gallery")}</Link>
            <Link href="/my-plots" className="hover:text-[#292524] transition">{t("footer.plots")}</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
