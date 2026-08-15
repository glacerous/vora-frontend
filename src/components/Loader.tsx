"use client";

import React, { useId } from "react";

export default function Loader({ className = "", size = 130 }: { className?: string; size?: number }) {
  const id = useId().replace(/:/g, "");
  const filterId = `metaball-${id}`;

  return (
    <div
      className={`metaball-loader relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="50 50 400 400" className="w-full h-full overflow-visible">
        <defs>
          <filter id={filterId} x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 36 -10"
              result="fluid"
            />
            <feComposite in="SourceGraphic" in2="fluid" operator="atop" />
          </filter>
        </defs>
        
        {/* Arm 1 (Main cluster) */}
        <g className="arm" style={{ filter: `url(#${filterId})` }}>
          <circle className="joint" cx="250" cy="250" r="62" />
          <g className="arm1">
            <circle className="joint" cx="310" cy="250" r="38" />
            <g className="arm2">
              <circle className="joint" cx="395" cy="250" r="30" />
              <g className="arm3">
                <circle className="joint" cx="475" cy="250" r="22" />
              </g>
            </g>
            <g className="arm1">
              <circle className="joint" cx="315" cy="250" r="34" />
              <g className="arm2">
                <circle className="joint" cx="390" cy="250" r="22" />
                <g className="arm3">
                  <circle className="joint" cx="465" cy="250" r="16" />
                </g>
                <g className="arm2">
                  <circle className="joint" cx="385" cy="250" r="18" />
                  <g className="arm3">
                    <circle className="joint" cx="460" cy="250" r="15" />
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* Arm 2 (Asymmetric counter-branch) */}
        <g id="mir" className="arm" style={{ filter: `url(#${filterId})` }}>
          <circle className="joint" cx="250" cy="250" r="62" />
          <g className="arm1">
            <circle className="joint" cx="295" cy="250" r="36" />
            <g className="arm2">
              <circle className="joint" cx="405" cy="250" r="28" />
              <g className="arm3">
                <circle className="joint" cx="485" cy="250" r="20" />
              </g>
            </g>
            <g className="arm1">
              <circle className="joint" cx="290" cy="250" r="32" />
              <g className="arm2">
                <circle className="joint" cx="395" cy="250" r="20" />
                <g className="arm3">
                  <circle className="joint" cx="470" cy="250" r="15" />
                </g>
                <g className="arm2">
                  <circle className="joint" cx="400" cy="250" r="18" />
                  <g className="arm3">
                    <circle className="joint" cx="455" cy="250" r="14" />
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* Satellite droplets */}
        <g className="satellite1" style={{ filter: `url(#${filterId})` }}>
          <circle className="joint" cx="250" cy="250" r="24" />
        </g>
        <g className="satellite2" style={{ filter: `url(#${filterId})` }}>
          <circle className="joint" cx="250" cy="250" r="20" />
        </g>
      </svg>
    </div>
  );
}
