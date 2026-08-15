"use client";

import React from "react";

export default function Loader({ className = "", size = 64 }: { className?: string; size?: number }) {
  return (
    <div
      className={`metaball-loader relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 500 500" className="w-full h-full overflow-visible">
        <filter id="metaball">
          <feGaussianBlur in="SourceGraphic" stdDeviation="17" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 100 -7"
            result="fluid"
          />
          <feComposite in="SourceGraphic" in2="fluid" operator="atop" />
        </filter>
        <g className="arm">
          <line className="segment" x1="250" y1="250" x2="300" y2="250" />
          <circle className="joint" cx="250" cy="250" r="64" />
          <g className="arm1">
            <line className="segment" x1="300" y1="250" x2="400" y2="250" />
            <circle className="joint" cx="300" cy="250" r="30" />
            <g className="arm2">
              <line className="segment" x1="400" y1="250" x2="490" y2="250" />
              <circle className="joint" cx="400" cy="250" r="24" />
              <g className="arm3">
                <line className="segment" x1="490" y1="250" x2="550" y2="250" />
                <circle className="joint" cx="490" cy="250" r="16" />
              </g>
            </g>
            <g className="arm1">
              <line className="segment" x1="300" y1="250" x2="400" y2="250" />
              <circle className="joint" cx="300" cy="250" r="30" />
              <g className="arm2">
                <line className="segment" x1="400" y1="250" x2="490" y2="250" />
                <circle className="joint" cx="400" cy="250" r="8" />
                <g className="arm3">
                  <line className="segment" x1="490" y1="250" x2="550" y2="250" />
                  <circle className="joint" cx="490" cy="250" r="8" />
                </g>
                <g className="arm2">
                  <line className="segment" x1="400" y1="250" x2="490" y2="250" />
                  <circle className="joint" cx="400" cy="250" r="8" />
                  <g className="arm3">
                    <line className="segment" x1="490" y1="250" x2="550" y2="250" />
                    <circle className="joint" cx="490" cy="250" r="8" />
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>
        <g id="mir" className="arm">
          <line className="segment" x1="250" y1="250" x2="300" y2="250" />
          <circle className="joint" cx="250" cy="250" r="64" />
          <g className="arm1">
            <line className="segment" x1="300" y1="250" x2="400" y2="250" />
            <circle className="joint" cx="300" cy="250" r="30" />
            <g className="arm2">
              <line className="segment" x1="400" y1="250" x2="490" y2="250" />
              <circle className="joint" cx="400" cy="250" r="24" />
              <g className="arm3">
                <line className="segment" x1="490" y1="250" x2="550" y2="250" />
                <circle className="joint" cx="490" cy="250" r="16" />
              </g>
            </g>
            <g className="arm1">
              <line className="segment" x1="300" y1="250" x2="400" y2="250" />
              <circle className="joint" cx="300" cy="250" r="30" />
              <g className="arm2">
                <line className="segment" x1="400" y1="250" x2="490" y2="250" />
                <circle className="joint" cx="400" cy="250" r="8" />
                <g className="arm3">
                  <line className="segment" x1="490" y1="250" x2="550" y2="250" />
                  <circle className="joint" cx="490" cy="250" r="8" />
                </g>
                <g className="arm2">
                  <line className="segment" x1="400" y1="250" x2="490" y2="250" />
                  <circle className="joint" cx="400" cy="250" r="8" />
                  <g className="arm3">
                    <line className="segment" x1="490" y1="250" x2="550" y2="250" />
                    <circle className="joint" cx="490" cy="250" r="8" />
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
