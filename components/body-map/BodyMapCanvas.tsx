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
  getFatigueOpacity,
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
    const baseOpacity = hasData ? getFatigueOpacity(fatigueScore) : 0.45;

    const isHovered = hoveredMuscle === muscle;
    const isSelected = selectedMuscle === muscle;
    const opacity = isHovered ? Math.min(baseOpacity + 0.2, 1) : baseOpacity;

    const shapeProps: Record<string, unknown> = {
      fill: fillColor,
      opacity,
      stroke: isSelected ? "#ffffff" : isHovered ? fillColor : "none",
      strokeWidth: isSelected ? 1 : isHovered ? 0.5 : 0,
      className: "cursor-pointer transition-opacity duration-150",
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
        className="w-full max-w-[180px] sm:max-w-[220px] md:max-w-[260px] h-auto"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Body muscle map — click a muscle for details"
      >
        {/* ── Body silhouette ─────────────────────────────────────────── */}
        <g className="fill-slate-300 dark:fill-slate-600" stroke="none">
          {/* Head */}
          <circle cx="50" cy="10" r="8.5" />
          {/* Neck */}
          <rect x="46" y="18" width="8" height="9" />
          {/* Torso — shoulder-wide at top, tapers to waist, flares slightly at hips */}
          <path d="M 16,27 L 84,27 L 80,62 L 72,90 L 74,112 L 26,112 L 28,90 L 20,62 Z" />
          {/* Left upper arm */}
          <path d="M 10,27 L 19,27 L 18,86 L 10,86 Z" />
          {/* Right upper arm */}
          <path d="M 81,27 L 90,27 L 90,86 L 82,86 Z" />
          {/* Left forearm */}
          <path d="M 10,85 L 18,85 L 17,130 L 10,130 Z" />
          {/* Right forearm */}
          <path d="M 82,85 L 90,85 L 90,130 L 83,130 Z" />
          {/* Left thigh */}
          <path d="M 26,112 L 44,112 L 44,174 L 28,174 Z" />
          {/* Right thigh */}
          <path d="M 56,112 L 74,112 L 72,174 L 56,174 Z" />
          {/* Left calf */}
          <path d="M 28,173 L 44,173 L 43,215 L 30,215 Z" />
          {/* Right calf */}
          <path d="M 56,173 L 72,173 L 70,215 L 57,215 Z" />
        </g>

        {/* ── Muscle overlays ─────────────────────────────────────────── */}
        <g>
          {BODY_MAP_MUSCLES.map((muscle) =>
            renderMuscleRegion(muscle as MuscleGroup)
          )}
        </g>
      </svg>

      {/* Recovery colour legend */}
      <div className="hidden" aria-hidden="true">
        <span style={{ color: "#22C55E" }}>Green = full recovery</span>
        <span style={{ color: "#F59E0B" }}>Yellow = moderate fatigue</span>
        <span style={{ color: "#F97316" }}>Orange = high fatigue</span>
        <span style={{ color: "#EF4444" }}>Red = overloaded</span>
      </div>
    </div>
  );
};

export default BodyMapCanvas;
