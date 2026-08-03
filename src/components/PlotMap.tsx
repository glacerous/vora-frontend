"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Scan {
  id: number;
  tree_code: string;
  co2e_kg: number;
  gps_lat: number | null;
  gps_lon: number | null;
  thumbnail_url?: string | null;
}

interface PlotMapProps {
  scans: Scan[];
  centroidLat: number | null;
  centroidLon: number | null;
}

// Leaflet icon bugfix for Webpack/Next.js environments
const customIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function PlotMap({ scans, centroidLat, centroidLon }: PlotMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Filter scans that have valid coordinates
    const validPins = scans.filter((s) => s.gps_lat !== null && s.gps_lon !== null) as (Scan & { gps_lat: number; gps_lon: number })[];

    // Determine initial center and zoom
    let centerLat = -6.2088;
    let centerLon = 106.8456;
    let zoomLevel = 13;

    if (centroidLat !== null && centroidLon !== null) {
      centerLat = centroidLat;
      centerLon = centroidLon;
      zoomLevel = 16;
    } else if (validPins.length > 0) {
      centerLat = validPins[0].gps_lat;
      centerLon = validPins[0].gps_lon;
      zoomLevel = 16;
    }

    // Initialize map if not already initialized
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        center: [centerLat, centerLon],
        zoom: zoomLevel,
        zoomControl: true,
      });

      // Dark style tile layer (perfect fit for Vora's premium dark aesthetics)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20
      }).addTo(mapRef.current);
    } else {
      mapRef.current.setView([centerLat, centerLon], zoomLevel);
    }

    // Clear existing markers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Add markers for each scan pin
    const bounds = L.latLngBounds([]);
    validPins.forEach((scan) => {
      const popupContent = `
        <div style="color: #0d0f12; font-family: sans-serif; padding: 4px;">
          <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 600;">${scan.tree_code}</h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #4a5568;">Biomass CO₂e: <b>${scan.co2e_kg.toFixed(2)} kg</b></p>
          ${scan.thumbnail_url ? `<img src="${scan.thumbnail_url}" style="width: 100%; max-height: 80px; object-fit: cover; border-radius: 6px;" />` : ""}
        </div>
      `;

      const marker = L.marker([scan.gps_lat, scan.gps_lon], { icon: customIcon })
        .addTo(mapRef.current!)
        .bindPopup(popupContent);

      bounds.extend([scan.gps_lat, scan.gps_lon]);
    });

    // Fit bounds if there are pins
    if (validPins.length > 1 && mapRef.current) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }

    // Cleanup function
    return () => {
      // We don't necessarily need to destroy map here to avoid flash,
      // but let's keep it clean or handle tab changes
    };
  }, [scans, centroidLat, centroidLon]);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-800/80 shadow-inner relative">
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: "350px" }} />
    </div>
  );
}
