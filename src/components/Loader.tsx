"use client";

import React, { useId } from "react";

export default function Loader({ className = "", size = 96 }: { className?: string; size?: number }) {
  const id = useId().replace(/:/g, "");
  const filterId = `fluid-${id}`;

  return (
    <div
      className={`metaball-loader relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="11" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -7"
              result="fluid"
            />
            <feComposite in="SourceGraphic" in2="fluid" operator="atop" />
          </filter>
        </defs>
        <g style={{ filter: `url(#${filterId})` }}>
          {/* Central Mother Droplet */}
          <circle className="fluid-core" cx="100" cy="100" r="30" fill="#616c39" />
          
          {/* Orbiting Satellite Droplets */}
          <g className="fluid-orbit-1">
            <circle cx="100" cy="54" r="19" fill="#616c39" />
          </g>
          <g className="fluid-orbit-2">
            <circle cx="100" cy="144" r="17" fill="#616c39" />
          </g>
          <g className="fluid-orbit-3">
            <circle cx="56" cy="100" r="15" fill="#616c39" />
          </g>
        </g>
      </svg>
    </div>
  );
}
