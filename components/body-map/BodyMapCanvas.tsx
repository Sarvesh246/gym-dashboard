"use client";

import React, { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { BodyMapData, MuscleGroup } from "@/lib/recovery/types";
import {
  MUSCLE_REGIONS,
  BODY_MAP_MUSCLES,
  MuscleRegion,
} from "@/lib/body-map/mapping";
import {
  getMuscleFillColor,
  getFatigueOpacity,
  getFatigueStrokeWidth,
  getRecoveryTier,
  getGlowEffect,
} from "@/lib/body-map/visualization";

interface BodyMapCanvasProps {
  muscleData: BodyMapData;
  onMuscleClick: (muscle: MuscleGroup) => void;
  onMuscleHover?: (muscle: MuscleGroup | null) => void;
  selectedMuscle?: MuscleGroup | null;
}

interface MuscleState {
  recoveryScore: number;
  fatigueScore: number;
}

/**
 * Minimalist geometric front-body silhouette SVG
 * Viewbox: 0 0 100 200 (front-facing, anatomically proportioned)
 * Interactive: hoverable and clickable muscle regions
 * Colors: Green/Yellow/Orange/Red based on recovery tier
 */
export const BodyMapCanvas: React.FC<BodyMapCanvasProps> = ({
  muscleData,
  onMuscleClick,
  onMuscleHover,
  selectedMuscle,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleGroup | null>(null);

  const getMuscleState = useCallback(
    (muscle: MuscleGroup): MuscleState => {
      const data = muscleData[muscle];
      if (!data) {
        return { recoveryScore: 0, fatigueScore: 100 };
      }
      return {
        recoveryScore: data.recovery_score ?? 0,
        fatigueScore: data.fatigue_score ?? 100,
      };
    },
    [muscleData]
  );

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

  const handleClick = useCallback(
    (muscle: MuscleGroup) => {
      onMuscleClick(muscle);
    },
    [onMuscleClick]
  );

  const renderMuscleRegion = (muscle: MuscleGroup): React.ReactNode => {
    const region = MUSCLE_REGIONS[muscle];
    if (!region) return null;

    const state = getMuscleState(muscle);
    const tier = getRecoveryTier(state.recoveryScore);
    const fillColor = getMuscleFillColor(tier);
    const opacity = getFatigueOpacity(state.fatigueScore);
    const strokeWidth = getFatigueStrokeWidth(state.fatigueScore);
    const glowEffect = getGlowEffect(state.fatigueScore, tier);
    const isHovered = hoveredMuscle === muscle;
    const isSelected = selectedMuscle === muscle;

    const commonProps = {
      key: region.id,
      fill: fillColor,
      stroke: fillColor,
      strokeWidth,
      opacity,
      className: "cursor-pointer transition-all duration-300",
      onMouseEnter: () => handleMouseEnter(muscle),
      onMouseLeave: handleMouseLeave,
      onClick: () => handleClick(muscle),
    };

    // Base variants for Framer Motion
    const baseVariants = {
      initial: { scale: 1 },
      hover: { scale: 1.08 },
    };

    const element = (
      <motion.g
        key={region.id}
        initial="initial"
        animate={isHovered ? "hover" : "initial"}
        variants={baseVariants}
        transition={{ duration: 0.2, type: "spring", stiffness: 300 }}
      >
        {region.svgElement === "circle" && (
          <circle
            cx={region.cx}
            cy={region.cy}
            r={region.r}
            {...commonProps}
            style={isHovered ? { opacity: opacity + 0.15 } : undefined}
          />
        )}

        {region.svgElement === "ellipse" && (
          <ellipse
            cx={region.cx}
            cy={region.cy}
            rx={region.rx}
            ry={region.ry}
            {...commonProps}
            style={isHovered ? { opacity: opacity + 0.15 } : undefined}
          />
        )}

        {region.svgElement === "polygon" && (
          <polygon
            points={region.points}
            {...commonProps}
            style={isHovered ? { opacity: opacity + 0.15 } : undefined}
          />
        )}

        {region.svgElement === "path" && (
          <path
            d={region.d}
            {...commonProps}
            style={isHovered ? { opacity: opacity + 0.15 } : undefined}
          />
        )}

        {region.svgElement === "rect" && (
          <rect
            x={region.x}
            y={region.y}
            width={region.width}
            height={region.height}
            {...commonProps}
            style={isHovered ? { opacity: opacity + 0.15 } : undefined}
          />
        )}
      </motion.g>
    );

    return element;
  };

  return (
    <div className="flex justify-center items-center w-full">
      <svg
        ref={svgRef}
        viewBox="0 0 100 200"
        className="w-full max-w-xs h-auto sm:max-w-sm md:max-w-md"
        style={{ maxHeight: "600px" }}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Body muscle map"
      >
        {/* SVG definitions for potential future use (filters, masks, etc.) */}
        <defs>
          {/* Subtle radial gradient for depth (optional) */}
          <radialGradient id="muscleGradient" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopOpacity="0.1" />
            <stop offset="100%" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Render all muscles in order */}
        <g id="bodyMap">
          {BODY_MAP_MUSCLES.map((muscle) => renderMuscleRegion(muscle as MuscleGroup))}
        </g>

        {/* Subtle outline/border for context (optional head, etc.) */}
        {/* Can be enhanced later with more anatomical context */}
      </svg>

      {/* Legend below SVG */}
      <style jsx>{`
        svg {
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.05));
        }
      `}</style>
    </div>
  );
};

export default BodyMapCanvas;
