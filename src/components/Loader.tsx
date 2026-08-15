"use client";

import React, { useId } from "react";

export default function Loader({ className = "", size = 84 }: { className?: string; size?: number }) {
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
        <g className="arm" style={{ filter: `url(#${filterId})` }}>
          <circle className="joint" cx="250" cy="250" r="54" />
          <g className="arm1">
            <circle className="joint" cx="300" cy="250" r="28" />
            <g className="arm2">
              <circle className="joint" cx="400" cy="250" r="22" />
              <g className="arm3">
                <circle className="joint" cx="490" cy="250" r="16" />
              </g>
            </g>
            <g className="arm1">
              <circle className="joint" cx="300" cy="250" r="28" />
              <g className="arm2">
                <circle className="joint" cx="400" cy="250" r="12" />
                <g className="arm3">
                  <circle className="joint" cx="490" cy="250" r="10" />
                </g>
                <g className="arm2">
                  <circle className="joint" cx="400" cy="250" r="12" />
                  <g className="arm3">
                    <circle className="joint" cx="490" cy="250" r="10" />
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>
        <g id="mir" className="arm" style={{ filter: `url(#${filterId})` }}>
          <circle className="joint" cx="250" cy="250" r="54" />
          <g className="arm1">
            <circle className="joint" cx="300" cy="250" r="28" />
            <g className="arm2">
              <circle className="joint" cx="400" cy="250" r="22" />
              <g className="arm3">
                <circle className="joint" cx="490" cy="250" r="16" />
              </g>
            </g>
            <g className="arm1">
              <circle className="joint" cx="300" cy="250" r="28" />
              <g className="arm2">
                <circle className="joint" cx="400" cy="250" r="12" />
                <g className="arm3">
                  <circle className="joint" cx="490" cy="250" r="10" />
                </g>
                <g className="arm2">
                  <circle className="joint" cx="400" cy="250" r="12" />
                  <g className="arm3">
                    <circle className="joint" cx="490" cy="250" r="10" />
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
