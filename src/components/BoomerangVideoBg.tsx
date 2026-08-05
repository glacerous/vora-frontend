"use client";

import React, { useState } from "react";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260715_090628_7052d8a6-a094-4341-a4a2-ad58493a67a9.mp4";

export default function BoomerangVideoBg() {
  const [videoLoaded, setVideoLoaded] = useState(false);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden w-full h-full bg-[#f8fafc]">
      {/* Skeleton Pulse Placeholder */}
      <div 
        className={`absolute inset-0 bg-[#e2e8f0]/40 animate-pulse transition-opacity duration-700 ease-out z-10 ${
          videoLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
        }`} 
      />

      <video
        src={VIDEO_URL}
        muted
        playsInline
        autoPlay
        loop
        preload="auto"
        crossOrigin="anonymous"
        onLoadedData={() => setVideoLoaded(true)}
        className={`w-full h-full object-cover object-[15%_top] transition-opacity duration-700 ease-out will-change-transform ${
          videoLoaded ? "opacity-100" : "opacity-0"
        }`}
        style={{
          // Hardware acceleration optimization
          transform: "translate3d(0, 0, 0)",
          backfaceVisibility: "hidden",
        }}
      />
    </div>
  );
}
