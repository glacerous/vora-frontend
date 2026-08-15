"use client";

import React, { useId } from "react";

export default function Loader({ className = "", size = 110 }: { className?: string; size?: number }) {
  const id = useId().replace(/:/g, "");
  const filterId = `fluid-${id}`;

  return (
    <div
      className={`metaball-loader relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 240 240" className="w-full h-full overflow-visible">
        <defs>
          <filter id={filterId} x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8.5" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -6"
              result="fluid"
            />
            <feComposite in="SourceGraphic" in2="fluid" operator="atop" />
          </filter>
        </defs>
        <g style={{ filter: `url(#${filterId})` }}>
          {/* Main Core Droplet */}
          <circle className="fluid-core" cx="120" cy="120" r="28" fill="#616c39" />
          
          {/* Main orbiting fluid blob (merges & detaches) */}
          <g className="fluid-orbit-1">
            <circle cx="120" cy="55" r="18" fill="#616c39" />
          </g>
          
          {/* Secondary fluid droplet */}
          <g className="fluid-orbit-2">
            <circle cx="120" cy="180" r="15" fill="#616c39" />
          </g>
          
          {/* Little satellite bead */}
          <g className="fluid-orbit-3">
            <circle cx="48" cy="120" r="12" fill="#616c39" />
          </g>

          {/* Micro stray droplet (adds organic randomness) */}
          <g className="fluid-orbit-4">
            <circle cx="185" cy="95" r="9" fill="#616c39" />
          </g>
        </g>
      </svg>
    </div>
  );
}
