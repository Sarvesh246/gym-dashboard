"use client";

import React, { useState, useCallback } from "react";
import { BodyMapData, MuscleGroup } from "@/lib/recovery/types";
import {
  MUSCLE_REGIONS,
  BODY_MAP_MUSCLES,
  MuscleShape,
} from "@/lib/body-map/mapping";
import {
  getMuscleFillColor,
  getRecoveryTier,
} from "@/lib/body-map/visualization";

interface BodyMapCanvasProps {
  muscleData: BodyMapData;
  onMuscleClick: (muscle: MuscleGroup) => void;
  onMuscleHover?: (muscle: MuscleGroup | null) => void;
  selectedMuscle?: MuscleGroup | null;
}

function renderShape(shape: MuscleShape, props: Record<string, unknown>, key: number) {
  switch (shape.svgElement) {
    case "circle":
      return <circle key={key} cx={shape.cx} cy={shape.cy} r={shape.r} {...(props as React.SVGProps<SVGCircleElement>)} />;
    case "ellipse":
      return <ellipse key={key} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...(props as React.SVGProps<SVGEllipseElement>)} />;
    case "polygon":
      return <polygon key={key} points={shape.points} {...(props as React.SVGProps<SVGPolygonElement>)} />;
    case "path":
      return <path key={key} d={shape.d} {...(props as React.SVGProps<SVGPathElement>)} />;
    case "rect":
      return <rect key={key} x={shape.x} y={shape.y} width={shape.width} height={shape.height} {...(props as React.SVGProps<SVGRectElement>)} />;
    default:
      return null;
  }
}

export const BodyMapCanvas: React.FC<BodyMapCanvasProps> = ({
  muscleData,
  onMuscleClick,
  onMuscleHover,
  selectedMuscle,
}) => {
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleGroup | null>(null);

  const handleMouseEnter = useCallback(
    (muscle: MuscleGroup) => {
      setHoveredMuscle(muscle);
      onMuscleHover?.(muscle);
    },
    [onMuscleHover]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredMuscle(null);
    onMuscleHover?.(null);
  }, [onMuscleHover]);

  const renderMuscleRegion = (muscle: MuscleGroup): React.ReactNode => {
    const region = MUSCLE_REGIONS[muscle];
    if (!region) return null;

    const data = muscleData[muscle];
    const hasData = !!data;
    const recoveryScore = data?.recovery_score ?? 100;
    const fatigueScore = data?.fatigue_score ?? 0;

    const tier = hasData ? getRecoveryTier(recoveryScore) : "gray";
    const fillColor = getMuscleFillColor(tier);

    const isHovered = hoveredMuscle === muscle;
    const isSelected = selectedMuscle === muscle;

    // Fatigue subtly drives rest-state opacity so high-load muscles read as more present
    const fatigueFactor = hasData ? Math.max(0, Math.min(100, fatigueScore)) / 100 : 0.3;
    const baseFillOpacity = 0.20 + fatigueFactor * 0.15; // 0.20–0.35

    const fillOpacity = isSelected ? 0.55 : isHovered ? 0.45 : baseFillOpacity;
    const strokeColor = isSelected ? "#e2e8f0" : fillColor;
    const strokeOpacity = isSelected ? 0.92 : isHovered ? 1 : 0.70;
    const strokeWidth = isSelected ? 0.80 : isHovered ? 0.60 : 0.38;

    // Ambient glow for overloaded/high-fatigue muscles even at rest
    const ambientGlow = !isHovered && !isSelected && (tier === "red" || (tier === "orange" && fatigueFactor > 0.65));
    const filter = isSelected
      ? "url(#glow-strong)"
      : isHovered
      ? "url(#glow-hover)"
      : ambientGlow
      ? "url(#glow-ambient)"
      : undefined;

    const shapeProps: Record<string, unknown> = {
      fill: fillColor,
      fillOpacity,
      stroke: strokeColor,
      strokeOpacity,
      strokeWidth,
      filter,
      style: { transition: "fill-opacity 0.18s ease, stroke-opacity 0.18s ease, stroke-width 0.18s ease" },
      className: "cursor-pointer",
      onMouseEnter: () => handleMouseEnter(muscle),
      onMouseLeave: handleMouseLeave,
      onClick: () => onMuscleClick(muscle),
    };

    return (
      <g key={region.id}>
        {region.shapes.map((shape, idx) => renderShape(shape, shapeProps, idx))}
      </g>
    );
  };

  return (
    <div className="flex justify-center items-center w-full py-4">
      <svg
        viewBox="0 0 100 220"
        className="w-full max-w-[200px] sm:max-w-[240px] md:max-w-[280px] h-auto drop-shadow-2xl"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Body muscle map — click a muscle for details"
      >
        <defs>
          {/* ── Mannequin fill: horizontal gradient gives left/right rim depth ── */}
          <linearGradient id="bodyFillGrad" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#0a1628" />
            <stop offset="18%"  stopColor="#14263d" />
            <stop offset="50%"  stopColor="#1c3350" />
            <stop offset="82%"  stopColor="#14263d" />
            <stop offset="100%" stopColor="#0a1628" />
          </linearGradient>

          {/* ── Rim light: blue-steel highlights on the silhouette edges ── */}
          <linearGradient id="rimLightGrad" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#5b9ec9" stopOpacity="0.90" />
            <stop offset="28%"  stopColor="#3a6a8a" stopOpacity="0.28" />
            <stop offset="72%"  stopColor="#3a6a8a" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#5b9ec9" stopOpacity="0.90" />
          </linearGradient>

          {/* ── Inner top highlight line to reinforce "3-D panel" look ── */}
          <linearGradient id="topShineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#7ab8d9" stopOpacity="0" />
            <stop offset="30%"  stopColor="#7ab8d9" stopOpacity="0.35" />
            <stop offset="70%"  stopColor="#7ab8d9" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7ab8d9" stopOpacity="0" />
          </linearGradient>

          {/* ── Glow filters ── */}
          {/* Subtle ambient glow for overloaded/high-fatigue nodes */}
          <filter id="glow-ambient" x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Hover — bright halo */}
          <filter id="glow-hover" x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Selected — strong double-halo */}
          <filter id="glow-strong" x="-65%" y="-65%" width="230%" height="230%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.0" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Mannequin silhouette ───────────────────────────────────────── */}
        <g fill="url(#bodyFillGrad)" stroke="url(#rimLightGrad)" strokeWidth="0.55" strokeLinejoin="round">
          {/* Head — sphere with slight flat bottom */}
          <circle cx="50" cy="10" r="8.5" />

          {/* Neck */}
          <path d="M 46.5,18 L 53.5,18 L 53.5,27 L 46.5,27 Z" />

          {/* Torso — shoulders curve inward to waist, then flare to hips */}
          <path d="M 16,27 Q 33,24.5 50,25.5 Q 67,24.5 84,27 L 80,62 L 71,90 L 73,112 L 27,112 L 29,90 L 20,62 Z" />

          {/* Left upper arm */}
          <path d="M 10.5,27 L 19,27 L 18,86 L 10.5,86 Z" />
          {/* Right upper arm */}
          <path d="M 81,27 L 89.5,27 L 89.5,86 L 82,86 Z" />

          {/* Left forearm — slight taper */}
          <path d="M 10.5,85.5 L 18,85.5 L 17,130 L 11,130 Z" />
          {/* Right forearm */}
          <path d="M 82,85.5 L 89.5,85.5 L 89,130 L 83,130 Z" />

          {/* Left thigh */}
          <path d="M 27,112 L 44,112 L 43.5,174 L 28.5,174 Z" />
          {/* Right thigh */}
          <path d="M 56,112 L 73,112 L 71.5,174 L 56.5,174 Z" />

          {/* Left calf */}
          <path d="M 28.5,173.5 L 43.5,173.5 L 42.5,215 L 30,215 Z" />
          {/* Right calf */}
          <path d="M 56.5,173.5 L 71.5,173.5 L 70,215 L 57.5,215 Z" />
        </g>

        {/* ── Top-edge specular shine across the torso shoulders ─────────── */}
        <path
          d="M 19,27 Q 34,24 50,25 Q 66,24 81,27"
          fill="none"
          stroke="url(#topShineGrad)"
          strokeWidth="0.7"
          strokeLinecap="round"
          opacity="0.6"
          pointerEvents="none"
        />

        {/* ── Muscle data overlays ─────────────────────────────────────────── */}
        <g>
          {BODY_MAP_MUSCLES.map((muscle) =>
            renderMuscleRegion(muscle as MuscleGroup)
          )}
        </g>
      </svg>
    </div>
  );
};

export default BodyMapCanvas;
