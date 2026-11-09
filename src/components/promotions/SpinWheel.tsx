"use client";

import React from "react";
import { SpinSegment } from "@/lib/types";

interface SpinWheelProps {
  segments: SpinSegment[];
  rotation: number;
  isSpinning: boolean;
  onSpinEnd?: () => void;
  onWheelClick?: () => void;
  size?: number;
}

export default function SpinWheel({
  segments,
  rotation,
  isSpinning,
  onSpinEnd,
  onWheelClick,
  size = 300,
}: SpinWheelProps) {
  const numSegments = segments.length || 6;
  const sliceAngle = 360 / numSegments;
  const radius = 140;
  const center = 150;

  // Generate SVG path for a circular pie slice
  const getSlicePath = (index: number) => {
    const startAngle = (index * sliceAngle - 90) * (Math.PI / 180);
    const endAngle = ((index + 1) * sliceAngle - 90) * (Math.PI / 180);

    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
  };

  return (
    <div
      onClick={() => {
        if (!isSpinning && onWheelClick) onWheelClick();
      }}
      className={`relative flex items-center justify-center select-none ${!isSpinning ? "cursor-pointer group" : "cursor-default"}`}
      style={{ width: size, height: size }}
      title={!isSpinning ? "Click or tap to spin the wheel!" : "Spinning..."}
    >
      {/* Outer Glow Halo & Static Shadow (Static, so it does not wobble during rotation) */}
      <div className="absolute inset-[2px] rounded-full bg-[#68122F]/[0.06] blur-xl pointer-events-none" />
      <div className="absolute inset-1 rounded-full shadow-[0_10px_26px_rgba(29,29,31,0.16)] pointer-events-none" />

      {/* Top Fixed Gold Pointer */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_2px_4px_rgba(0,0,0,0.16)] pointer-events-none">
        <svg width="34" height="42" viewBox="0 0 34 42" fill="none">
          <path
            d="M17 40L4 6C3 4 4.5 1 7 1H27C29.5 1 31 4 30 6L17 40Z"
            fill="url(#goldPointerGrad)"
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
          <circle cx="17" cy="12" r="4" fill="#FFFFFF" />
          <defs>
            <linearGradient id="goldPointerGrad" x1="4" y1="1" x2="30" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFFFFF" />
              <stop offset="1" stopColor="#68122F" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Rotating Wheel Container (GPU Hardware-Accelerated, zero jitter) */}
      <div
        className="w-full h-full relative"
        style={{
          transform: `rotate(${rotation}deg) translateZ(0)`,
          WebkitTransform: `rotate(${rotation}deg) translateZ(0)`,
          transformOrigin: "50% 50%",
          willChange: isSpinning ? "transform" : "auto",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          transition: isSpinning
            ? "transform 6.5s cubic-bezier(0.12, 0.85, 0.2, 1)"
            : "transform 0.4s ease-out",
        }}
        onTransitionEnd={onSpinEnd}
      >
        <svg
          viewBox="0 0 300 300"
          className="w-full h-full block"
        >
          <defs>
            {/* Outer Gold Rim Gradient */}
            <linearGradient id="goldRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E9E6E5" />
            </linearGradient>

            {/* Inner Center Hub Gradient */}
            <radialGradient id="centerHubGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#8A294A" />
              <stop offset="100%" stopColor="#68122F" />
            </radialGradient>
          </defs>

          {/* Outer Metallic Ring */}
          <circle cx={center} cy={center} r="148" fill="url(#goldRimGrad)" stroke="#DEDADD" strokeWidth="1.5" />
          <circle cx={center} cy={center} r="141" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="1" />

          {/* Wheel Slices */}
          {segments.map((segment, index) => {
            const midAngle = (index * sliceAngle + sliceAngle / 2) - 90;
            const textRadius = radius * 0.65;
            const textAngleRad = midAngle * (Math.PI / 180);
            const textX = center + textRadius * Math.cos(textAngleRad);
            const textY = center + textRadius * Math.sin(textAngleRad);

            return (
              <g key={segment.id || index}>
                {/* Slice Wedge */}
                <path
                  d={getSlicePath(index)}
                  fill={segment.color || (index % 2 === 0 ? "#64152F" : "#FFFFFF")}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />

                {/* Reward label */}
                <g transform={`translate(${textX}, ${textY}) rotate(${midAngle + 90})`}>
                  <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={segment.textColor || "#FFFFFF"}
                    fontSize="7.5"
                    fontWeight="700"
                    letterSpacing="0.02em"
                    style={{
                      fontFamily: "system-ui, -apple-system, sans-serif",
                      textShadow: segment.textColor === "#111111" ? "none" : "0 1px 2px rgba(0,0,0,0.8)",
                    }}
                  >
                    {segment.label.length > 14
                      ? segment.label.slice(0, 13) + "…"
                      : segment.label}
                  </text>
                </g>
              </g>
            );
          })}

          <circle cx={center} cy={center} r="34" fill="#FFFFFF" stroke="#E5E5E7" strokeWidth="1.5" />
          <circle cx={center} cy={center} r="27" fill="url(#centerHubGrad)" />
          <text x={center} y={center + 5} textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="700" letterSpacing=".08em">SPIN</text>
        </svg>
      </div>
    </div>
  );
}
