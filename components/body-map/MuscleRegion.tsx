"use client";

import React, { memo } from "react";
import { MuscleGroup } from "@/lib/recovery/types";
import { MUSCLE_REGIONS, MuscleShape } from "@/lib/body-map/mapping";
import {
  getMuscleFillColor,
  getRecoveryTier,
} from "@/lib/body-map/visualization";
import type { BodyMapMuscleData } from "@/lib/recovery/types";

interface MuscleRegionProps {
  muscle: MuscleGroup;
  data: BodyMapMuscleData | undefined;
  isSelected: boolean;
  isHovered: boolean;
  onMouseEnter: (muscle: MuscleGroup) => void;
  onMouseLeave: () => void;
  onClick: (muscle: MuscleGroup) => void;
}

function renderShape(
  shape: MuscleShape,
  props: React.SVGProps<SVGElement>,
  key: number
): React.ReactNode {
  switch (shape.svgElement) {
    case "circle":
      return (
        <circle
          key={key}
          cx={shape.cx}
          cy={shape.cy}
          r={shape.r}
          {...(props as React.SVGProps<SVGCircleElement>)}
        />
      );
    case "ellipse":
      return (
        <ellipse
          key={key}
          cx={shape.cx}
          cy={shape.cy}
          rx={shape.rx}
          ry={shape.ry}
          {...(props as React.SVGProps<SVGEllipseElement>)}
        />
      );
    case "polygon":
      return (
        <polygon
          key={key}
          points={shape.points}
          {...(props as React.SVGProps<SVGPolygonElement>)}
        />
      );
    case "path":
      return (
        <path
          key={key}
          d={shape.d}
          {...(props as React.SVGProps<SVGPathElement>)}
        />
      );
    case "rect":
      return (
        <rect
          key={key}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          {...(props as React.SVGProps<SVGRectElement>)}
        />
      );
    default:
      return null;
  }
}

/**
 * Memoized SVG group for a single muscle region.
 * Only re-renders when its specific props change, keeping full-map re-renders minimal.
 */
export const MuscleRegion: React.FC<MuscleRegionProps> = memo(
  ({ muscle, data, isSelected, isHovered, onMouseEnter, onMouseLeave, onClick }) => {
    const region = MUSCLE_REGIONS[muscle];
    if (!region) return null;

    const hasData = !!data;
    const recoveryScore = data?.recovery_score ?? 100;
    const fatigueScore  = data?.fatigue_score  ?? 0;

    const tier      = hasData ? getRecoveryTier(recoveryScore) : "gray";
    const fillColor = getMuscleFillColor(tier);

    // Fatigue subtly drives rest-state opacity so loaded muscles read as more present
    const fatigueFactor    = hasData ? Math.max(0, Math.min(100, fatigueScore)) / 100 : 0.3;
    const baseFillOpacity  = 0.20 + fatigueFactor * 0.15; // 0.20–0.35

    const fillOpacity  = isSelected ? 0.55 : isHovered ? 0.45 : baseFillOpacity;
    const strokeColor  = isSelected ? "#e2e8f0" : fillColor;
    const strokeOpacity= isSelected ? 0.92 : isHovered ? 1 : 0.70;
    const strokeWidth  = isSelected ? 0.80 : isHovered ? 0.60 : 0.38;

    // Ambient glow for overloaded/high-fatigue muscles at rest
    const ambientGlow =
      !isHovered && !isSelected && (tier === "red" || (tier === "orange" && fatigueFactor > 0.65));
    const filter = isSelected
      ? "url(#glow-strong)"
      : isHovered
      ? "url(#glow-hover)"
      : ambientGlow
      ? "url(#glow-ambient)"
      : undefined;

    const shapeProps = {
      fill:         fillColor,
      fillOpacity,
      stroke:       strokeColor,
      strokeOpacity,
      strokeWidth,
      filter,
      style: {
        transition:
          "fill-opacity 0.18s ease, stroke-opacity 0.18s ease, stroke-width 0.18s ease",
      },
      className: "cursor-pointer",
      onMouseEnter: () => onMouseEnter(muscle),
      onMouseLeave,
      onClick:      () => onClick(muscle),
    } as React.SVGProps<SVGElement>;

    return (
      <g key={region.id} aria-label={region.label} role="button" tabIndex={0}>
        {region.shapes.map((shape, idx) => renderShape(shape, shapeProps, idx))}
      </g>
    );
  },
  (prev, next) =>
    prev.muscle     === next.muscle   &&
    prev.isSelected === next.isSelected &&
    prev.isHovered  === next.isHovered &&
    prev.data       === next.data
);

MuscleRegion.displayName = "MuscleRegion";

export default MuscleRegion;
