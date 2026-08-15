"use client";

import React, { useId } from "react";

export default function Loader({ className = "", size = 88 }: { className?: string; size?: number }) {
  const id = useId().replace(/:/g, "");
  const filterId = `metaball-${id}`;

  return (
    <div
      className={`metaball-loader relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 500 500" className="w-full h-full overflow-visible">
        <defs>
          <filter id={filterId} x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 38 -10"
              result="fluid"
            />
            <feComposite in="SourceGraphic" in2="fluid" operator="atop" />
          </filter>
        </defs>
        
        {/* Arm 1 (Organic main cluster) */}
        <g className="arm" style={{ filter: `url(#${filterId})` }}>
          <circle className="joint" cx="250" cy="250" r="56" />
          <g className="arm1">
            <circle className="joint" cx="305" cy="250" r="28" />
            <g className="arm2">
              <circle className="joint" cx="395" cy="250" r="22" />
              <g className="arm3">
                <circle className="joint" cx="485" cy="250" r="16" />
              </g>
            </g>
            <g className="arm1">
              <circle className="joint" cx="310" cy="250" r="26" />
              <g className="arm2">
                <circle className="joint" cx="390" cy="250" r="14" />
                <g className="arm3">
                  <circle className="joint" cx="475" cy="250" r="11" />
                </g>
                <g className="arm2">
                  <circle className="joint" cx="385" cy="250" r="12" />
                  <g className="arm3">
                    <circle className="joint" cx="470" cy="250" r="10" />
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* Arm 2 (Asymmetric chaotic counter-branch) */}
        <g id="mir" className="arm" style={{ filter: `url(#${filterId})` }}>
          <circle className="joint" cx="250" cy="250" r="56" />
          <g className="arm1">
            <circle className="joint" cx="295" cy="250" r="30" />
            <g className="arm2">
              <circle className="joint" cx="405" cy="250" r="20" />
              <g className="arm3">
                <circle className="joint" cx="495" cy="250" r="15" />
              </g>
            </g>
            <g className="arm1">
              <circle className="joint" cx="290" cy="250" r="24" />
              <g className="arm2">
                <circle className="joint" cx="395" cy="250" r="13" />
                <g className="arm3">
                  <circle className="joint" cx="480" cy="250" r="10" />
                </g>
                <g className="arm2">
                  <circle className="joint" cx="400" cy="250" r="13" />
                  <g className="arm3">
                    <circle className="joint" cx="465" cy="250" r="9" />
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* Floating chaotic satellite droplets that fuse into the fluid pool */}
        <g className="satellite1" style={{ filter: `url(#${filterId})` }}>
          <circle className="joint" cx="250" cy="250" r="18" />
        </g>
        <g className="satellite2" style={{ filter: `url(#${filterId})` }}>
          <circle className="joint" cx="250" cy="250" r="15" />
        </g>
      </svg>
    </div>
  );
}
