"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";

// Dynamic load of Leaflet map (client-only)
const PlotMap = dynamic(() => import("@/components/PlotMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center min-h-[350px]">
      <span className="w-6 h-6 border-2 border-[#191919] border-t-transparent rounded-full animate-spin mr-2" />
      <p className="text-xs text-slate-500 font-medium">Memuat peta satelit...</p>
    </div>
  ),
});

interface Owner {
  username: string;
  display_name: string;
}

interface Plot {
  id: number;
  plot_code: string;
  name: string;
  description: string;
  privacy: "public" | "private";
  gps_centroid_lat: number | null;
  gps_centroid_lon: number | null;
  session_active: boolean;
  created_at: string;
  owner: Owner;
  owner_user_id?: number;
}

interface Scan {
  id: number;
  tree_code: string;
  scan_date: string;
  dbh_cm: number;
  tinggi_m: number;
  biomassa_kg: number;
  karbon_kg: number;
  co2e_kg: number;
  co2e_uncertainty_pct: number;
  thumbnail_url?: string | null;
  gps_lat: number | null;
  gps_lon: number | null;
  quality_status: string;
}

interface Aggregation {
  total_co2e_kg: number;
  combined_uncertainty_kg: number;
  combined_uncertainty_pct: number;
}

import { useAuth } from "@/components/AuthProvider";

export default function PlotDetailPage() {
  const router = useRouter();
  const params = useParams();
  const plotCode = params.plot_code as string;

  const { user: currentUser } = useAuth();
  const [plot, setPlot] = useState<Plot | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [aggregation, setAggregation] = useState<Aggregation | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Check ownership
  useEffect(() => {
    if (plot && currentUser) {
      setIsOwner(
        currentUser.id === plot.owner_user_id || 
        currentUser.username === plot.owner?.username
      );
    } else {
      setIsOwner(false);
    }
  }, [plot, currentUser]);

  // Fetch plot details
  const fetchPlotDetails = async () => {
    try {
      // Fetch plot details
      const plotRes = await fetch(`${BACKEND_URL}/plots/${plotCode}`, {
        credentials: "include",
      });

      if (!plotRes.ok) {
        if (plotRes.status === 403) {
          throw new Error("Plot ini bersifat privat dan hanya dapat diakses oleh pemilik.");
        } else if (plotRes.status === 404) {
          throw new Error("Plot tidak ditemukan.");
        } else {
          throw new Error("Gagal mengambil detail plot.");
        }
      }

      const data = await plotRes.json();
      setPlot(data.plot);
      setScans(data.scans || []);
      setAggregation(data.aggregation);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan koneksi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlotDetails();
  }, [plotCode]);

  const toggleSession = async () => {
    if (!plot) return;
    setActionLoading(true);
    setError(null);

    const endpoint = plot.session_active ? "stop" : "start";

    try {
      const res = await fetch(`${BACKEND_URL}/plots/${plot.id}/session/${endpoint}`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Gagal mengubah status sesi");
      }

      // Refresh plot details
      await fetchPlotDetails();
    } catch (err: any) {
      setError(err.message || "Gagal mengontrol sesi");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50/60 text-[#191919] flex flex-col items-center justify-center">
        <span className="w-8 h-8 border-3 border-[#191919] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-500 font-medium">Mengambil informasi detail plot...</p>
      </main>
    );
  }

  if (error && !plot) {
    return (
      <main className="min-h-screen bg-slate-50/60 text-[#191919] flex flex-col items-center justify-center px-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 border border-red-150 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-650" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-800 mb-2">Akses Terbatas</h2>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <Link href="/my-plots" className="bg-[#191919] hover:bg-[#191919]/90 text-white font-semibold text-xs rounded-xl px-4 py-2.5 transition-all shadow-sm">
              Kembali ke Dashboard
            </Link>
            <Link href="/login" className="border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs rounded-xl px-4 py-2.5 transition-all">
              Masuk Akun
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const gpsScans = scans.filter((s) => s.gps_lat !== null && s.gps_lon !== null);

  return (
    <div className="min-h-screen bg-slate-50/60 text-[#191919] flex flex-col font-sans">

      <main className="flex-1 pt-28 pb-16 px-6 relative overflow-hidden">
        {/* Background radial overlays */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] aspect-square rounded-full bg-emerald-500/5 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square rounded-full bg-slate-200/50 blur-[130px] pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Back Link */}
          <div className="mb-6 flex justify-between items-center">
            <Link href="/my-plots" className="text-xs text-slate-500 hover:text-emerald-700 transition-colors flex items-center gap-1.5 font-medium">
              ← Kembali ke Dashboard
            </Link>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono bg-slate-100 text-slate-500 border border-slate-200/50 px-2 py-0.5 rounded">
                {plot?.plot_code}
              </span>
              <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full border ${
                plot?.privacy === "public"
                  ? "bg-sky-50 text-sky-700 border-sky-100"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}>
                {plot?.privacy}
              </span>
            </div>
          </div>

          {/* Hero Section */}
          <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#191919] font-serif">{plot?.name}</h1>
              <p className="text-xs text-slate-500 mt-2 max-w-xl leading-relaxed">{plot?.description || "Tidak ada deskripsi."}</p>
              <p className="text-[10px] text-slate-400 mt-4 leading-none">
                Dibuat oleh <span className="text-slate-700 font-semibold">{plot?.owner.display_name}</span> pada {plot && new Date(plot.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            {isOwner && (
              <div className="flex flex-col gap-3 w-full md:w-auto">
                <button
                  onClick={toggleSession}
                  disabled={actionLoading}
                  className={`w-full md:w-auto font-semibold text-xs rounded-xl px-5 py-3 transition-all select-none cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
                    plot?.session_active
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-[#191919] text-white hover:bg-[#191919]/90"
                  }`}
                >
                  {actionLoading ? (
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : plot?.session_active ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      Selesai Sesi Scan
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-white" />
                      Mulai Sesi Scan
                    </>
                  )}
                </button>

                {plot?.session_active && (
                  <p className="text-[10px] text-emerald-700 text-center md:text-left leading-normal animate-pulse font-medium">
                    * Scan baru akan otomatis masuk ke plot ini.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Stats Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Total Biomassa CO₂e</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold tracking-wide text-slate-905">
                  {aggregation?.total_co2e_kg.toLocaleString("id-ID")}
                </span>
                <span className="text-xs text-slate-500">kg</span>
              </div>
              {aggregation && aggregation.total_co2e_kg > 0 && (
                <span className="text-[10px] text-slate-650 mt-2 font-medium bg-slate-50 border border-slate-200/50 px-2 py-1 rounded w-fit">
                  &plusmn; {aggregation.combined_uncertainty_kg.toFixed(1)} kg ({aggregation.combined_uncertainty_pct.toFixed(1)}%)
                </span>
              )}
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-505 mb-1">Jumlah Pohon</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold tracking-wide text-slate-905">{scans.length}</span>
                <span className="text-xs text-slate-505">pohon</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-2.5 leading-none">
                Rata-rata: {scans.length > 0 ? (aggregation!.total_co2e_kg / scans.length).toFixed(1) : 0} kg CO₂e / pohon
              </span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-505 mb-1">GPS Centroid</span>
              <div className="text-sm font-semibold tracking-wide text-slate-800">
                {plot && plot.gps_centroid_lat !== null && plot.gps_centroid_lon !== null ? (
                  <div className="flex flex-col gap-0.5">
                    <span>Lat: {plot.gps_centroid_lat.toFixed(6)}</span>
                    <span>Lon: {plot.gps_centroid_lon.toFixed(6)}</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-450 font-normal italic">Belum terisi koordinat</span>
                )}
              </div>
            </div>
          </section>

          {/* Map and Tree Scans List */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Map Column */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-505">Peta Sebaran Pohon</h2>
              <div className="h-[380px] bg-slate-50 rounded-2xl overflow-hidden relative border border-slate-200">
                <PlotMap
                  scans={scans}
                  centroidLat={plot?.gps_centroid_lat || null}
                  centroidLon={plot?.gps_centroid_lon || null}
                />
              </div>
              {gpsScans.length < scans.length && (
                <p className="text-[10px] text-slate-450 leading-normal italic">
                  * Menampilkan {gpsScans.length} dari {scans.length} pohon ({scans.length - gpsScans.length} pohon tidak memiliki data GPS EXIF).
                </p>
              )}
            </div>

            {/* List Column */}
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-505">Daftar Pohon ({scans.length})</h2>
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-4 max-h-[380px] overflow-y-auto">
                {scans.length === 0 ? (
                  <div className="text-center py-12 text-slate-450 italic text-xs leading-relaxed">
                    Belum ada rekaman pohon dalam plot ini.
                  </div>
                ) : (
                  scans.map((scan) => (
                    <div
                      key={scan.id}
                      className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200/60 rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        {scan.thumbnail_url ? (
                          <img
                            src={scan.thumbnail_url}
                            alt={scan.tree_code}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-mono">
                            No Pic
                          </div>
                        )}
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{scan.tree_code}</h4>
                          <p className="text-[9px] text-slate-550 mt-1">
                            DBH: {scan.dbh_cm.toFixed(1)} cm | Tinggi: {scan.tinggi_m.toFixed(1)} m
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-900 block">
                          {scan.co2e_kg.toFixed(1)} kg
                        </span>
                        <span className="text-[9px] text-slate-450 font-medium">CO₂e</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
