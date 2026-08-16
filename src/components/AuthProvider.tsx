"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";

// ── Authentication Context ───────────────────────────────────────────────────

interface User {
  id: number;
  username: string;
  display_name: string;
  is_demo_account: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isWakingUp: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Translation Dictionary ───────────────────────────────────────────────────

export type Language = "id" | "en";
export type UnitSystem = "metric" | "imperial";
export type SplatQuality = "high" | "medium" | "low";

export function formatDbh(dbh_cm: number | null | undefined, unit: UnitSystem = "metric"): string {
  if (dbh_cm === null || dbh_cm === undefined) return "-";
  if (unit === "imperial") {
    return `${(dbh_cm / 2.54).toFixed(1)} in`;
  }
  return `${dbh_cm.toFixed(1)} cm`;
}

export function formatHeight(height_m: number | null | undefined, unit: UnitSystem = "metric"): string {
  if (height_m === null || height_m === undefined) return "-";
  if (unit === "imperial") {
    return `${(height_m * 3.28084).toFixed(1)} ft`;
  }
  return `${height_m.toFixed(1)} m`;
}

export function formatWeight(weight_kg: number | null | undefined, unit: UnitSystem = "metric"): string {
  if (weight_kg === null || weight_kg === undefined) return "-";
  if (unit === "imperial") {
    return `${(weight_kg * 2.20462).toFixed(1)} lb`;
  }
  return `${weight_kg.toFixed(1)} kg`;
}

export function formatCo2e(co2e_kg: number | null | undefined, unit: UnitSystem = "metric"): string {
  if (co2e_kg === null || co2e_kg === undefined) return "-";
  if (unit === "imperial") {
    return `${(co2e_kg * 2.20462).toFixed(0)} lb CO₂e`;
  }
  return `${co2e_kg.toFixed(0)} kg CO₂e`;
}


export const translations: Record<string, { id: string; en: string }> = {
  // ── Navbar ──────────────────────────────────────────────────────────────
  "nav.gallery": { id: "Galeri", en: "Gallery" },
  "nav.myPlots": { id: "Plot Saya", en: "My Plots" },
  "nav.newScan": { id: "Scan Baru", en: "New Scan" },
  "nav.login": { id: "Masuk", en: "Log In" },
  "nav.register": { id: "Daftar", en: "Sign Up" },
  "nav.logout": { id: "Keluar", en: "Logout" },
  "nav.user": { id: "Pengguna", en: "User" },
  "nav.settings": { id: "Pengaturan", en: "Settings" },

  // ── Settings Modal ──────────────────────────────────────────────────────
  "settings.title": { id: "Pengaturan Sistem", en: "System Settings" },
  "settings.subtitle": {
    id: "Sesuaikan preferensi tampilan, bahasa, dan konfigurasi analisis 3D.",
    en: "Customize display preferences, language, and 3D analysis configuration.",
  },
  "settings.language": { id: "Bahasa Tampilan", en: "Display Language" },
  "settings.languageDesc": {
    id: "Pilih bahasa antarmuka aplikasi Vora.",
    en: "Choose the interface language for Vora.",
  },
  "settings.unit": { id: "Sistem Satuan", en: "Unit System" },
  "settings.unitDesc": {
    id: "Satuan untuk DBH, biomassa, dan volume.",
    en: "Units for DBH, biomass, and volume metrics.",
  },
  "settings.unitMetric": { id: "Metrik (cm, m, kg, t CO₂e)", en: "Metric (cm, m, kg, t CO₂e)" },
  "settings.unitImperial": { id: "Imperial (in, ft, lb, ton)", en: "Imperial (in, ft, lb, ton)" },
  "settings.splatQuality": { id: "Kualitas Rendering 3D", en: "3D Splat Rendering Quality" },
  "settings.splatQualityDesc": {
    id: "Atur resolusi partikel Gaussian Splat pada peramban.",
    en: "Adjust Gaussian Splat particle budget in the browser.",
  },
  "settings.qualityHigh": { id: "Tinggi (Ultra)", en: "High (Ultra)" },
  "settings.qualityMedium": { id: "Sedang (Standar)", en: "Medium (Standard)" },
  "settings.qualityLow": { id: "Hemat Daya (Performa)", en: "Power Saver (Performance)" },
  "settings.autoRotate": { id: "Rotasi Otomatis Viewer 3D", en: "3D Viewer Auto-Rotation" },
  "settings.autoRotateDesc": {
    id: "Putar model pohon 3D secara otomatis saat pertama dibuka.",
    en: "Automatically rotate 3D tree models upon opening.",
  },
  "settings.showFps": { id: "Tampilkan FPS Viewer", en: "Show Viewer FPS" },
  "settings.showFpsDesc": {
    id: "Tampilkan informasi frame rate saat melihat model 3D.",
    en: "Display real-time frame rate when viewing 3D models.",
  },
  "settings.reset": { id: "Reset ke Default", en: "Reset to Defaults" },
  "settings.saved": { id: "Tersimpan otomatis", en: "Auto-saved" },
  "settings.close": { id: "Tutup", en: "Close" },

  // ── Landing Page (Hero) ─────────────────────────────────────────────────
  "hero.title": { id: "Ukur karbon pohon.", en: "Measure forest carbon." },
  "hero.subtitle": {
    id: "Rekonstruksi 3D Gaussian Splatting volumetrik dan estimasi karbon alometrik untuk konservasi lingkungan. Bangun model 3D pohon berdensitas tinggi, ukur DBH, dan verifikasi stok biomassa langsung dari peramban Anda.",
    en: "Volumetric 3D Gaussian Splatting and allometric carbon estimation for environmental conservation. Reconstruct high-density tree models, measure DBH, and verify stored biomass from your browser.",
  },
  "hero.viewExample": { id: "Lihat Contoh Scan", en: "View Example Scan" },
  "hero.startAnalyzing": { id: "Mulai Analisis", en: "Start Analyzing" },

  // ── Showcase Terminal Demo ──────────────────────────────────────────────
  "showcase.terminalTitle": { id: "Rekonstruksi Lapangan 3D", en: "3D Field Reconstruction" },
  "showcase.version": { id: "v2.4 · MASt3R + InstantSplat", en: "v2.4 · MASt3R + InstantSplat" },
  "showcase.idlePrompt": {
    id: "Tarik video 360° pohon atau masukkan kode plot",
    en: "Drop 360° tree video or enter plot code",
  },
  "showcase.idleSub": {
    id: "Unggah langsung ke cloud · Pengepasan DBH otomatis RANSAC",
    en: "Direct cloud upload · Auto RANSAC DBH fit",
  },
  "showcase.readyBadge": { id: "SIAP REKONSTRUKSI 3D", en: "READY FOR SPLAT" },
  "showcase.groundCalib": { id: "Kalibrasi Tanah (1.30m)", en: "Ground Calibrated (1.30m)" },

  // ── 3 Sub-Cards under showcase ──────────────────────────────────────────
  "subcard.splat.title": { id: "3D Splatting", en: "3D Splatting" },
  "subcard.splat.desc": {
    id: "Rekonstruksi volumetrik 3D yang cepat dan fotorealistik untuk kebutuhan tim lapangan Anda.",
    en: "Fast and photorealistic 3D volumetric reconstruction your field teams can work with.",
  },
  "subcard.ransac.title": { id: "RANSAC Permukaan Tanah", en: "Ground RANSAC" },
  "subcard.ransac.desc": {
    id: "Isolasi kemiringan kontur tanah, hitung DBH pada ketinggian 1,3 m, dan bersihkan partikel liar di udara.",
    en: "Isolate ground plane slope, calculate DBH at 1.3m, and filter stray background particles.",
  },
  "subcard.allometric.title": { id: "Stok Alometrik", en: "Allometric Stock" },
  "subcard.allometric.desc": {
    id: "Lakukan estimasi karbon berstandar IPCC Tier-1 dan persamaan biomassa Chave secara otomatis.",
    en: "Give your research full compliance with IPCC Tier-1 and Chave biomass equations.",
  },
  "subcard.docs": { id: "DOKUMENTASI", en: "DOCS" },

  // ── Stats Bar ───────────────────────────────────────────────────────────
  "stats.timeValue": { id: "~3 Menit", en: "~3 Mins" },
  "stats.timeLabel": { id: "Rata-rata waktu rekonstruksi", en: "Average reconstruction latency" },
  "stats.framesValue": { id: "48 Frame", en: "48 Frames" },
  "stats.framesLabel": { id: "Ekstraksi cerdas video 360°", en: "Smart 360° video extraction" },
  "stats.accuracyValue": { id: "±1.5 cm", en: "±1.5 cm" },
  "stats.accuracyLabel": { id: "Toleransi akurasi DBH", en: "DBH measurement tolerance" },
  "stats.webglValue": { id: "100% WebGL", en: "100% WebGL" },
  "stats.webglLabel": { id: "Interaktif tanpa instalasi", en: "Interactive zero-install viewer" },

  // ── Deep Dive #01 ───────────────────────────────────────────────────────
  "feat1.eyebrow": { id: "#01 — 3D GAUSSIAN SPLATTING", en: "#01 — 3D GAUSSIAN SPLATTING" },
  "feat1.title": {
    id: "Ubah video ponsel menjadi model 3D berakurasi milimeter.",
    en: "Turn phone video into millimeter-accurate 3D models.",
  },
  "feat1.item1.title": { id: "Pencocokan Citra Ganda MASt3R", en: "MASt3R Dual-View Matching" },
  "feat1.item1.desc": {
    id: "Triangulasi point-cloud rapat dari frame video yang tumpang-tindih merekonstruksi pose kamera dengan presisi tinggi tanpa penanda fisik.",
    en: "Dense point-cloud triangulation across overlapping video frames recovers millimeter-accurate camera poses without markers.",
  },
  "feat1.item2.title": { id: "Optimasi GPU InstantSplat", en: "InstantSplat GPU Optimization" },
  "feat1.item2.desc": {
    id: "Rendering neural A10G cloud membangun ellipsoida 3D yang konsisten dan fotorealistik dalam waktu kurang dari 60 detik.",
    en: "Cloud A10G neural rendering constructs photorealistic, view-consistent 3D ellipsoids in under 60 seconds.",
  },
  "feat1.item3.title": { id: "Isolasi Permukaan RANSAC", en: "RANSAC Ground-Isolation" },
  "feat1.item3.desc": {
    id: "Ekstraksi bidang tanah otomatis memisahkan lereng kontur hutan dan mengeliminasi 100% partikel melayang di udara.",
    en: "Automated plane extraction separates the forest terrain slope and eliminates 100% of air floater particles.",
  },
  "feat1.node1.title": { id: "Input Frame Video 360°", en: "Input 360° Video Frames" },
  "feat1.node1.sub": { id: "48 sudut pandang tumpang-tindih @ 800px", en: "48 high-overlap views @ 800px" },
  "feat1.node1.badge": { id: "LOLOS", en: "PASSED" },
  "feat1.node2.title": { id: "RANSAC Tanah & Potongan DBH", en: "Ground RANSAC & DBH Slice" },
  "feat1.node2.sub": { id: "Pengepasan lingkaran pada 1,30m · DBH = 13,69 cm", en: "Circle fitting at 1.30m · DBH = 13.69 cm" },
  "feat1.node2.badge": { id: "TEROPTIMASI", en: "OPTIMIZED" },
  "feat1.node3.title": { id: "3D Gaussian Splatting (.ksplat)", en: "3D Gaussian Splatting (.ksplat)" },
  "feat1.node3.sub": { id: "Mesh volumetrik terkompresi siap untuk WebGL", en: "Compressed volumetric mesh ready for WebGL" },
  "feat1.node3.badge": { id: "SIAP", en: "READY" },
  "feat1.link": { id: "Pelajari Selengkapnya tentang Pipeline 3D Splatting →", en: "All About 3D Splatting Pipeline →" },

  // ── Deep Dive #02 ───────────────────────────────────────────────────────
  "feat2.eyebrow": { id: "#02 — ESTIMASI KARBON ALOMETRIK", en: "#02 — ALLOMETRIC CARBON ESTIMATION" },
  "feat2.title": {
    id: "Otomatisasi biomassa pohon dari DBH hingga stok karbon terverifikasi.",
    en: "Automate tree biomass from DBH to verifiable carbon stock.",
  },
  "feat2.cert.title": { id: "Sertifikat Audit · POHON-8782", en: "Audit Certificate · POHON-8782" },
  "feat2.cert.badge": { id: "GERBANG 1 & 2 LOLOS", en: "GATE 1 & 2 PASSED" },
  "feat2.cert.species": { id: "Klasifikasi Spesies", en: "Species Classification" },
  "feat2.cert.dbh": { id: "DBH Terukur (1.30m)", en: "Measured DBH (1.30m)" },
  "feat2.cert.agb": { id: "Biomassa Atas Tanah (AGB)", en: "Above-Ground Biomass (AGB)" },
  "feat2.cert.c": { id: "Total Karbon Tersimpan (C)", en: "Total Stored Carbon (C)" },
  "feat2.cert.co2e": { id: "Setara Karbon Dioksida (CO₂e)", en: "CO₂ Equivalent (CO₂e)" },
  "feat2.item1.title": { id: "Persamaan Chave et al. (2005)", en: "Chave et al. (2005) Equation" },
  "feat2.item1.desc": {
    id: "Mengintegrasikan berat jenis kayu (ρ) dan geometri DBH untuk estimasi biomassa alometrik pohon tropis yang presisi.",
    en: "Integrates wood specific gravity (ρ) and geometric DBH for robust pantropical allometric biomass estimations.",
  },
  "feat2.item2.title": { id: "Rasio Akar Bawah Tanah (BGB)", en: "Below-Ground Root Ratio (BGB)" },
  "feat2.item2.desc": {
    id: "Menerapkan rasio akar-ke-pucuk Cairns untuk memastikan audit penghitungan karbon yang menyeluruh dan akuntabel.",
    en: "Applies Cairns root-to-shoot allometric ratios to ensure complete and auditable carbon accounting.",
  },
  "feat2.item3.title": { id: "Format JSON Terstruktur & Ekspor", en: "Structured JSON & Export" },
  "feat2.item3.desc": {
    id: "Ekspor instan telemetri berlabel GPS, penanda waktu, dan catatan audit terverifikasi untuk kebutuhan kredit karbon.",
    en: "Instantly export GPS-tagged telemetry, timestamps, and verifiable audit records for carbon credits.",
  },
  "feat2.link": { id: "Pelajari Selengkapnya tentang Estimasi Karbon Alometrik →", en: "All About Allometric Carbon Estimation →" },

  // ── Workflow Section ────────────────────────────────────────────────────
  "workflow.eyebrow": { id: "Alur Kerja Pemindaian", en: "Workflow Walkthrough" },
  "workflow.title": { id: "Tiga langkah mudah menghitung karbon.", en: "Three steps to compute carbon." },
  "workflow.step1.title": { id: "Rekam Putaran 360°", en: "Record 360° Walkthrough" },
  "workflow.step1.desc": {
    id: "Kelilingi pohon dengan kamera ponsel pintar apa pun. Ekstraktor cerdas CV2 mengisolasi frame tajam bertumpang-tindih langsung ke penyimpanan cloud.",
    en: "Walk around the tree with any smartphone camera. Smart CV2 extractor isolates sharp, high-overlap frames directly to cloud storage.",
  },
  "workflow.step2.title": { id: "Penyelarasan Geometri & Splatting", en: "Geometric Alignment & Splatting" },
  "workflow.step2.desc": {
    id: "Model MASt3R menyelaraskan pose kamera dan menghasilkan point cloud 3D rapat, dilanjutkan optimasi cepat 3D Gaussian Splatting.",
    en: "Dual-view MASt3R aligns camera poses and generates dense 3D point clouds, followed by fast 3D Gaussian Splatting optimization.",
  },
  "workflow.step3.title": { id: "Kalkulasi Biomassa & Sertifikat", en: "Biomass Calculation & Certificate" },
  "workflow.step3.desc": {
    id: "RANSAC mendeteksi bidang tanah dan mengekstrak DBH setinggi dada, tinggi pohon, stok biomassa, serta sertifikat audit terverifikasi.",
    en: "RANSAC detects the ground plane and fits a breast-height cylinder to extract DBH, tree height, carbon stock, and verifiable audit records.",
  },

  // ── Footer ──────────────────────────────────────────────────────────────
  "footer.rights": { id: "© 2026 Vora. Seluruh hak cipta dilindungi.", en: "© 2026 Vora. All rights reserved." },
  "footer.home": { id: "Beranda", en: "Home" },
  "footer.newScan": { id: "Scan Baru", en: "New Scan" },
  "footer.gallery": { id: "Galeri", en: "Gallery" },
  "footer.plots": { id: "Plot Saya", en: "Plots" },

  // ── Gallery Page ────────────────────────────────────────────────────────
  "gallery.title": { id: "Galeri Rekonstruksi Pohon 3D", en: "3D Tree Reconstruction Gallery" },
  "gallery.subtitle": {
    id: "Koleksi hasil pemindaian lapangan, estimasi DBH, dan sertifikat stok karbon terverifikasi.",
    en: "Collection of field scans, DBH estimates, and verified carbon stock certificates.",
  },
  "gallery.searchPlaceholder": { id: "Cari berdasarkan kode pohon, plot, atau spesies...", en: "Search by tree code, plot, or species..." },
  "gallery.filterAll": { id: "Semua Pohon", en: "All Trees" },
  "gallery.filterHighCarbon": { id: "Karbon Tinggi (>50 kg)", en: "High Carbon (>50 kg)" },
  "gallery.filterCalibrated": { id: "Terkalibrasi", en: "Calibrated" },
  "gallery.noScans": { id: "Belum ada hasil rekonstruksi yang ditemukan.", en: "No reconstruction scans found." },
  "gallery.view3D": { id: "Buka Model 3D", en: "Open 3D Model" },
  "gallery.totalCarbon": { id: "Total Karbon", en: "Total Carbon" },

  // ── My Plots / Dashboard ────────────────────────────────────────────────
  "myPlots.title": { id: "Dasbor Plot Hutan Saya", en: "My Forest Plots Dashboard" },
  "myPlots.subtitle": {
    id: "Kelola plot inventarisasi, agregasi biomassa, dan pemetaan pohon terdaftar.",
    en: "Manage inventory plots, aggregate biomass, and map registered trees.",
  },
  "myPlots.createPlot": { id: "Buat Plot Baru", en: "Create New Plot" },
  "myPlots.totalPlots": { id: "Total Plot", en: "Total Plots" },
  "myPlots.totalTrees": { id: "Total Pohon Terpetakan", en: "Total Trees Mapped" },
  "myPlots.totalCarbonStock": { id: "Total Stok Karbon (CO₂e)", en: "Total Carbon Stock (CO₂e)" },
  "myPlots.emptyTitle": { id: "Belum Ada Plot Terdaftar", en: "No Plots Created Yet" },
  "myPlots.emptyDesc": {
    id: "Buat plot pertama Anda untuk mulai mengelompokkan hasil pemindaian pohon dan memantau stok karbon.",
    en: "Create your first plot to start grouping tree scans and tracking carbon stock.",
  },
  "myPlots.viewPlot": { id: "Buka Detail Plot", en: "View Plot Details" },

  // ── Reconstruct & 3D Viewer ─────────────────────────────────────────────
  "reconstruct.step1": { id: "Unggah Video", en: "Upload Walkthrough" },
  "reconstruct.step2": { id: "Tandai Batang", en: "Mark Trunk Axis" },
  "reconstruct.step3": { id: "Pemrosesan GPU", en: "GPU Processing" },
  "reconstruct.step4": { id: "Analisis 3D", en: "3D Analytics" },
  "reconstruct.dropTitle": { id: "Pilih atau Tarik Video 360° Pohon di Sini", en: "Select or Drag & Drop 360° Tree Video Here" },
  "reconstruct.dropSub": { id: "Format MP4 / MOV, durasi disarankan 20–60 detik", en: "MP4 / MOV format, recommended 20–60 seconds duration" },
  "reconstruct.selectFile": { id: "Pilih File dari Komputer", en: "Select File from Device" },
  "reconstruct.processing": { id: "Sedang memproses rekonstruksi di cloud GPU...", en: "Processing 3D reconstruction on cloud GPU..." },
  "reconstruct.viewResult": { id: "Lihat Hasil Analisis 3D", en: "View 3D Analytics Result" },
  "reconstruct.viewMode": { id: "MODE TAMPILAN", en: "VIEW MODE" },
  "reconstruct.viewHybrid": { id: "Hibrida (Keduanya)", en: "Hybrid (Both)" },
  "reconstruct.viewSplat": { id: "3D Gaussian Splatting", en: "3D Gaussian Splatting" },
  "reconstruct.viewPly": { id: "Hanya Point Cloud", en: "Point Cloud Only" },
  "reconstruct.viewNone": { id: "Tanpa Visual 3D", en: "None" },
  "reconstruct.cadOverlay": { id: "OVERLAY CAD", en: "CAD OVERLAY" },
  "reconstruct.cadAll": { id: "CAD + Titik Potong", en: "CAD + Highlights" },
  "reconstruct.cadCylinder": { id: "Hanya Silinder CAD", en: "Cylinder CAD Only" },
  "reconstruct.cadNone": { id: "Tanpa CAD", en: "No CAD" },
  "reconstruct.scanRecordFound": { id: "data scan ditemukan", en: "scan record found" },
  "reconstruct.speciesClassification": { id: "KLASIFIKASI SPESIES", en: "SPECIES CLASSIFICATION" },
  "reconstruct.topSpecimen": { id: "SPESIMEN UTAMA COCOK", en: "TOP SPECIMEN MATCH" },
  "reconstruct.confidence": { id: "Tingkat Keyakinan", en: "Confidence" },
  "reconstruct.otherCandidates": { id: "Kandidat Lain yang Mungkin", en: "Other Probable Candidates" },
  "reconstruct.howCalculated": { id: "CARA PERHITUNGAN INI DILAKUKAN", en: "HOW THIS WAS CALCULATED" },
  "reconstruct.paramDbh": { id: "Diameter Batang Setinggi Dada (DBH)", en: "Diameter at Breast Height (DBH)" },
  "reconstruct.paramHeight": { id: "Tinggi Pohon", en: "Tree Height" },
  "reconstruct.paramWoodDensity": { id: "Berat Jenis Kayu (ρ)", en: "Wood Density (ρ)" },
  "reconstruct.paramFormula": { id: "Persamaan Alometrik", en: "Allometric Equation" },
  "reconstruct.paramRootToShoot": { id: "Rasio Akar-ke-Pucuk (BGB)", en: "Root-to-Shoot Ratio (BGB)" },
  "reconstruct.paramUncertainty": { id: "Rentang Ketidakpastian CO₂e", en: "CO₂e Uncertainty Range" },
  "reconstruct.recalibBtn": { id: "Kalibrasi Ulang Batang (Foto 2D)", en: "Recalibrate Trunk (2D Photo)" },
  "reconstruct.alignBtn": { id: "Edit Penyelarasan 3D (Manual)", en: "Edit 3D Alignment (Manual)" },
  "reconstruct.downloadCert": { id: "Unduh Sertifikat Karbon", en: "Download Carbon Certificate" },
  "reconstruct.touchscreenNotice": { id: "Fitur Edit 3D Alignment memerlukan layar lebih besar (Tablet/Desktop)", en: "Edit 3D Alignment feature requires a larger screen (Tablet/Desktop)" },
  "reconstruct.preliminaryNotice": { id: "Data Preliminary: Scan ini belum divalidasi sensor metrik (skala uncalibrated/tinggi parsial). Sertifikat yang di-download memuat watermark PRELIMINARY DRAFT.", en: "Preliminary Data: This scan has not been validated by metric sensors (uncalibrated scale/partial height). The downloaded certificate contains a PRELIMINARY DRAFT watermark." },
  "reconstruct.timelineTitle": { id: "RIWAYAT PEMINDAIAN", en: "SCAN HISTORY TIMELINE" },
  "reconstruct.warningsTitle": { id: "PERINGATAN & CATATAN PEMINDAIAN", en: "SCAN ALERTS & WARNINGS" },
  "reconstruct.uncalibratedScale": { id: "SKALA BELUM TERKALIBRASI", en: "UNCALIBRATED SCALE" },
  "reconstruct.uncalibratedDesc": { id: "Nilai DBH/karbon menggunakan unit PLY default dan BELUM TERKALIBRASI. Lakukan kalibrasi skala metrik.", en: "DBH/carbon values use default PLY units and are UNRELIABLE. Perform metric scale calibration." },
  "reconstruct.uploadNew": { id: "Unggah Scan Baru", en: "Upload New Scan" },
  "reconstruct.dbh": { id: "DBH", en: "DBH" },
  "reconstruct.height": { id: "TINGGI", en: "HEIGHT" },
  "reconstruct.biomass": { id: "BIOMASSA", en: "BIOMASS" },
  "reconstruct.carbon": { id: "KARBON", en: "CARBON" },
  "reconstruct.co2e": { id: "CO₂e", en: "CO₂e" },
  "reconstruct.plotClaimStatus": { id: "STATUS PLOT & KLAIM", en: "PLOT & CLAIM STATUS" },
  "reconstruct.notClaimed": { id: "Belum diklaim ke plot mana pun", en: "Not claimed to any plot yet" },
  "reconstruct.claimedTo": { id: "Terklaim ke Plot", en: "Claimed to Plot" },
  "reconstruct.claimBtn": { id: "Klaim ke Plot", en: "Claim to Plot" },
  "reconstruct.claiming": { id: "Mengklaim...", en: "Claiming..." },
  "reconstruct.selectPlot": { id: "Pilih Plot Hutan...", en: "Select Forest Plot..." },

  // ── Recalibrate 2D Modal ────────────────────────────────────────────────
  "recalib.title": { id: "Kalibrasi Ulang Sumbu Batang", en: "Recalibrate Trunk Axis" },
  "recalib.sub": { id: "Klik dua titik pada foto 2D untuk menentukan arah sumbu batang.", en: "Click two points on the 2D image to set the trunk direction." },
  "recalib.step1": { id: "Langkah 1: Klik bagian PANGKAL batang", en: "Step 1: Click the BASE of the trunk" },
  "recalib.step2": { id: "Langkah 2: Klik bagian ATAS batang", en: "Step 2: Click the TOP/UPPER part of the trunk" },
  "recalib.step3": { id: "Langkah 3: Siap Kalibrasi Ulang", en: "Step 3: Ready to Recalibrate" },
  "recalib.loadingFrame": { id: "Memuat frame resolusi tinggi…", en: "Loading high-res frame…" },
  "recalib.guideTitle": { id: "Panduan Klik Batang", en: "Trunk Click Guide" },
  "recalib.pt1Label": { id: "1: Pangkal", en: "1: Base" },
  "recalib.pt2Label": { id: "2: Atas", en: "2: Top" },
  "recalib.guidePt1": { id: "Titik 1 (Pangkal): Klik di bagian batang yang lurus, sedikit di atas tanah & pelebaran akar.", en: "Point 1 (Base): Click where the trunk becomes a straight cylinder, slightly above the ground & root flares." },
  "recalib.guidePt2": { id: "Titik 2 (Atas): Klik lebih tinggi pada garis tengah batang yang lurus.", en: "Point 2 (Top): Click higher up on the straight trunk center line." },
  "recalib.guideAvoid": { id: "Hindari: Mengklik bagian banir/akar yang melebar di paling bawah.", en: "Avoid: Clicking the flared root buttress at the absolute bottom." },
  "recalib.reset": { id: "Reset Titik", en: "Reset Points" },
  "recalib.cancel": { id: "Batal", en: "Cancel" },
  "recalib.confirm": { id: "Konfirmasi Kalibrasi", en: "Confirm Recalibration" },
  "recalib.recalculating": { id: "Menghitung Ulang...", en: "Recalculating..." },

  // ── Manual 3D Alignment Modal ───────────────────────────────────────────
  "manual3d.title": { id: "Penyelarasan 3D Manual", en: "Manual 3D Alignment" },
  "manual3d.sub": { id: "Gunakan gizmo 3D untuk menggeser, memutar, dan mengubah ukuran silinder CAD.", en: "Use the 3D gizmo to translate, rotate, and scale the CAD cylinder." },
  "manual3d.save": { id: "Simpan & Hitung Ulang", en: "Save & Recalculate" },
  "manual3d.saving": { id: "Menyimpan...", en: "Saving..." },

  // ── Upload Form & Options ───────────────────────────────────────────────
  "upload.title": { id: "Unggah Video Pemindaian Pohon", en: "Upload Tree Scan Video" },
  "upload.sub": { id: "Rekam video mengitari pohon 360° secara perlahan dan menyeluruh.", en: "Record a 360° video orbiting the tree slowly and thoroughly." },
  "upload.gpsTag": { id: "Pelabelan GPS Otomatis", en: "Automatic GPS Tagging" },
  "upload.gpsDesc": { id: "Mengambil koordinat lokasi dari perangkat Anda untuk dicatat dalam sertifikat audit.", en: "Captures location coordinates from your device for audit certificates." },
  "upload.advSettings": { id: "Pengaturan Rekonstruksi Lanjutan", en: "Advanced Reconstruction Settings" },
  "upload.rembg": { id: "Hapus Latar Belakang (rembg)", en: "Remove Background (rembg)" },
  "upload.rembgDesc": { id: "Rekomendasi: Isolasi pohon dan bersihkan objek latar belakang untuk visualisasi 3D yang jernih.", en: "Recommendation: Isolate the tree and remove background objects for a clean 3D visualization." },
  "upload.arcore": { id: "Validasi Skala Sensor ARCore / ARKit VIO", en: "ARCore / ARKit VIO Sensor Validation" },
  "upload.iterations": { id: "Iterasi Rekonstruksi", en: "Reconstruction Iterations" },
  "upload.start": { id: "Mulai Rekonstruksi 3D", en: "Start 3D Reconstruction" },
  "reconstruct.step1": { id: "Unggah Video", en: "Upload Walkthrough" },
  "reconstruct.step2": { id: "Tandai Batang", en: "Mark Trunk Axis" },
  "reconstruct.step3": { id: "Pemrosesan GPU", en: "GPU Processing" },
  "reconstruct.step4": { id: "Analisis 3D", en: "3D Analytics" },
  "reconstruct.dropTitle": { id: "Tarik & Lepas Video 360° Pohon di Sini", en: "Drag & Drop 360° Tree Video Here" },
  "reconstruct.dropSub": { id: "Format MP4/MOV, durasi disarankan 20–60 detik", en: "MP4/MOV format, recommended 20–60 seconds duration" },
  "reconstruct.selectFile": { id: "Pilih File dari Komputer", en: "Select File from Device" },
  "reconstruct.processing": { id: "Sedang memproses rekonstruksi di cloud GPU...", en: "Processing 3D reconstruction on cloud GPU..." },
  "reconstruct.viewResult": { id: "Lihat Hasil Analisis 3D", en: "View 3D Analytics Result" },

  // ── Auth (Login & Register) ─────────────────────────────────────────────
  "auth.loginTitle": { id: "Masuk ke Akun Vora", en: "Log in to your Vora account" },
  "auth.loginSub": {
    id: "Akses dasbor plot, manajemen inventaris pohon, dan riwayat rekonstruksi 3D.",
    en: "Access your plot dashboard, tree inventory management, and 3D reconstruction history.",
  },
  "auth.registerTitle": { id: "Daftar Akun Baru", en: "Create your Vora account" },
  "auth.registerSub": {
    id: "Mulai memetakan pohon dan mengukur karbon hutan dengan presisi tinggi.",
    en: "Start mapping trees and measuring forest carbon with millimeter precision.",
  },
  "auth.email": { id: "Alamat Email", en: "Email Address" },
  "auth.password": { id: "Kata Sandi", en: "Password" },
  "auth.name": { id: "Nama Lengkap", en: "Full Name" },
  "auth.organization": { id: "Institusi / Organisasi (Opsional)", en: "Institution / Organization (Optional)" },
  "auth.loginBtn": { id: "Masuk Sekarang", en: "Log In" },
  "auth.registerBtn": { id: "Buat Akun", en: "Sign Up" },
  "auth.noAccount": { id: "Belum punya akun?", en: "Don't have an account?" },
  "auth.haveAccount": { id: "Sudah punya akun?", en: "Already have an account?" },
};

// ── Settings Context ────────────────────────────────────────────────────────

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  unit: UnitSystem;
  setUnit: (unit: UnitSystem) => void;
  splatQuality: SplatQuality;
  setSplatQuality: (q: SplatQuality) => void;
  autoRotate: boolean;
  setAutoRotate: (val: boolean) => void;
  showFps: boolean;
  setShowFps: (val: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  resetSettings: () => void;
  t: (key: string, fallback?: string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// ── Settings Modal Component ─────────────────────────────────────────────────

export function SettingsModal() {
  const settings = useContext(SettingsContext);
  if (!settings || !settings.isSettingsOpen) return null;

  const {
    language,
    setLanguage,
    unit,
    setUnit,
    splatQuality,
    setSplatQuality,
    autoRotate,
    setAutoRotate,
    showFps,
    setShowFps,
    setIsSettingsOpen,
    resetSettings,
    t,
  } = settings;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsSettingsOpen(false)}
          className="fixed inset-0 bg-[#0c0a09]/40 backdrop-blur-xs"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative z-10 w-full max-w-lg bg-[#ffffff] border border-[#e7e5e4] rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#e7e5e4] bg-[#fafaf9]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#616c39]/10 text-[#616c39] border border-[#616c39]/20 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-mono text-sm font-semibold text-[#292524] uppercase tracking-tight">
                  {t("settings.title")}
                </h3>
                <p className="text-xs text-[#79716b]">{t("settings.subtitle")}</p>
              </div>
            </div>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="p-2 text-[#79716b] hover:text-[#292524] hover:bg-[#e7e5e4]/50 rounded-lg transition cursor-pointer"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Options Body */}
          <div className="p-5 sm:p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            
            {/* Setting 1: Language Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e7e5e4]">
              <div>
                <span className="block font-sans text-xs sm:text-sm font-semibold text-[#292524]">
                  {t("settings.language")}
                </span>
                <span className="block text-xs text-[#79716b] mt-0.5">
                  {t("settings.languageDesc")}
                </span>
              </div>
              <div className="inline-flex bg-[#fafaf9] p-1 rounded-xl border border-[#e7e5e4] shrink-0">
                <button
                  type="button"
                  onClick={() => setLanguage("id")}
                  className={"px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer " + (language === "id" ? "bg-[#616c39] text-white shadow-2xs font-semibold" : "text-[#79716b] hover:text-[#292524]")}
                >
                  🇮🇩 ID
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={"px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer " + (language === "en" ? "bg-[#616c39] text-white shadow-2xs font-semibold" : "text-[#79716b] hover:text-[#292524]")}
                >
                  🇬🇧 EN
                </button>
              </div>
            </div>

            {/* Setting 2: Unit System */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e7e5e4]">
              <div>
                <span className="block font-sans text-xs sm:text-sm font-semibold text-[#292524]">
                  {t("settings.unit")}
                </span>
                <span className="block text-xs text-[#79716b] mt-0.5">
                  {t("settings.unitDesc")}
                </span>
              </div>
              <div className="inline-flex bg-[#fafaf9] p-1 rounded-xl border border-[#e7e5e4] shrink-0">
                <button
                  type="button"
                  onClick={() => setUnit("metric")}
                  className={"px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer " + (unit === "metric" ? "bg-[#616c39] text-white shadow-2xs font-semibold" : "text-[#79716b] hover:text-[#292524]")}
                >
                  Metrik (cm, kg)
                </button>
                <button
                  type="button"
                  onClick={() => setUnit("imperial")}
                  className={"px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer " + (unit === "imperial" ? "bg-[#616c39] text-white shadow-2xs font-semibold" : "text-[#79716b] hover:text-[#292524]")}
                >
                  Imperial (in, lb)
                </button>
              </div>
            </div>

            {/* Setting 3: Splat Quality */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e7e5e4]">
              <div>
                <span className="block font-sans text-xs sm:text-sm font-semibold text-[#292524]">
                  {t("settings.splatQuality")}
                </span>
                <span className="block text-xs text-[#79716b] mt-0.5">
                  {t("settings.splatQualityDesc")}
                </span>
              </div>
              <div className="inline-flex bg-[#fafaf9] p-1 rounded-xl border border-[#e7e5e4] shrink-0">
                <button
                  type="button"
                  onClick={() => setSplatQuality("high")}
                  className={"px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition cursor-pointer " + (splatQuality === "high" ? "bg-[#616c39] text-white font-semibold" : "text-[#79716b] hover:text-[#292524]")}
                >
                  Ultra
                </button>
                <button
                  type="button"
                  onClick={() => setSplatQuality("medium")}
                  className={"px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition cursor-pointer " + (splatQuality === "medium" ? "bg-[#616c39] text-white font-semibold" : "text-[#79716b] hover:text-[#292524]")}
                >
                  Standar
                </button>
                <button
                  type="button"
                  onClick={() => setSplatQuality("low")}
                  className={"px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition cursor-pointer " + (splatQuality === "low" ? "bg-[#616c39] text-white font-semibold" : "text-[#79716b] hover:text-[#292524]")}
                >
                  Hemat
                </button>
              </div>
            </div>

            {/* Setting 4: Auto-Rotate 3D Viewer */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#e7e5e4]">
              <div>
                <span className="block font-sans text-xs sm:text-sm font-semibold text-[#292524]">
                  {t("settings.autoRotate")}
                </span>
                <span className="block text-xs text-[#79716b] mt-0.5">
                  {t("settings.autoRotateDesc")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAutoRotate(!autoRotate)}
                className={"relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none " + (autoRotate ? "bg-[#616c39]" : "bg-[#e7e5e4]")}
              >
                <span
                  className={"pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out " + (autoRotate ? "translate-x-5" : "translate-x-0")}
                />
              </button>
            </div>

            {/* Setting 5: Show FPS Overlay */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="block font-sans text-xs sm:text-sm font-semibold text-[#292524]">
                  {t("settings.showFps")}
                </span>
                <span className="block text-xs text-[#79716b] mt-0.5">
                  {t("settings.showFpsDesc")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowFps(!showFps)}
                className={"relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none " + (showFps ? "bg-[#616c39]" : "bg-[#e7e5e4]")}
              >
                <span
                  className={"pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out " + (showFps ? "translate-x-5" : "translate-x-0")}
                />
              </button>
            </div>

          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-t border-[#e7e5e4] bg-[#fafaf9]">
            <button
              type="button"
              onClick={resetSettings}
              className="text-xs font-mono text-[#79716b] hover:text-[#ff0000] underline underline-offset-4 transition cursor-pointer"
            >
              {t("settings.reset")}
            </button>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-[#616c39] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#616c39] animate-pulse" />
                {t("settings.saved")}
              </span>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 bg-[#292524] hover:bg-[#1c1917] text-white text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                {t("settings.close")}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ── Combined Provider & Hooks ────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const router = useRouter();

  // Settings state (persistent with localStorage)
  const [language, setLanguageState] = useState<Language>("id");
  const [unit, setUnitState] = useState<UnitSystem>("metric");
  const [splatQuality, setSplatQualityState] = useState<SplatQuality>("high");
  const [autoRotate, setAutoRotateState] = useState<boolean>(true);
  const [showFps, setShowFpsState] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load preferences from localStorage on client mount
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("vora_lang") as Language | null;
      if (savedLang === "id" || savedLang === "en") {
        setLanguageState(savedLang);
      }
      const savedUnit = localStorage.getItem("vora_unit") as UnitSystem | null;
      if (savedUnit === "metric" || savedUnit === "imperial") {
        setUnitState(savedUnit);
      }
      const savedQuality = localStorage.getItem("vora_quality") as SplatQuality | null;
      if (savedQuality) setSplatQualityState(savedQuality);
      const savedAutoRotate = localStorage.getItem("vora_autorotate");
      if (savedAutoRotate !== null) setAutoRotateState(savedAutoRotate === "true");
      const savedFps = localStorage.getItem("vora_show_fps");
      if (savedFps !== null) setShowFpsState(savedFps === "true");
    } catch {}
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("vora_lang", lang);
    } catch {}
  };

  const toggleLanguage = () => {
    const nextLang = language === "id" ? "en" : "id";
    setLanguage(nextLang);
  };

  const setUnit = (u: UnitSystem) => {
    setUnitState(u);
    try {
      localStorage.setItem("vora_unit", u);
    } catch {}
  };

  const setSplatQuality = (q: SplatQuality) => {
    setSplatQualityState(q);
    try {
      localStorage.setItem("vora_quality", q);
    } catch {}
  };

  const setAutoRotate = (val: boolean) => {
    setAutoRotateState(val);
    try {
      localStorage.setItem("vora_autorotate", String(val));
    } catch {}
  };

  const setShowFps = (val: boolean) => {
    setShowFpsState(val);
    try {
      localStorage.setItem("vora_show_fps", String(val));
    } catch {}
  };

  const resetSettings = () => {
    setLanguage("id");
    setUnit("metric");
    setSplatQuality("high");
    setAutoRotate(true);
    setShowFps(false);
  };

  const t = (key: string, fallback?: string): string => {
    const entry = translations[key];
    if (!entry) return fallback || key;
    return entry[language] || entry["id"] || fallback || key;
  };

  const fetchUser = async () => {
    const wakeupTimer = setTimeout(() => {
      setIsWakingUp(true);
    }, 1500);

    try {
      const res = await fetch(BACKEND_URL + "/auth/me", {
        credentials: "include",
      });
      clearTimeout(wakeupTimer);
      setIsWakingUp(false);

      if (res.ok) {
        const data = await res.json();
        setUser(data);
        document.cookie = "session_token=true; path=/; max-age=31536000; SameSite=Lax";
      } else {
        setUser(null);
        document.cookie = "session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
      }
    } catch (err) {
      clearTimeout(wakeupTimer);
      setIsWakingUp(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch(BACKEND_URL + "/ping").catch(() => {});
    fetchUser();
  }, []);

  const logout = async () => {
    try {
      await fetch(BACKEND_URL + "/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.warn("Backend logout ping:", err);
    } finally {
      setUser(null);
      // Aggressively clear cookie across paths and max-age
      document.cookie = "session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
      document.cookie = "session_token=; path=/; max-age=0; SameSite=Lax";
      try {
        localStorage.removeItem("session_token");
        sessionStorage.clear();
      } catch {}
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isWakingUp, logout, refreshUser: fetchUser }}>
      <SettingsContext.Provider
        value={{
          language,
          setLanguage,
          toggleLanguage,
          unit,
          setUnit,
          splatQuality,
          setSplatQuality,
          autoRotate,
          setAutoRotate,
          showFps,
          setShowFps,
          isSettingsOpen,
          setIsSettingsOpen,
          resetSettings,
          t,
        }}
      >
        {children}
        <SettingsModal />
      </SettingsContext.Provider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within an AuthProvider");
  }
  return context;
}
