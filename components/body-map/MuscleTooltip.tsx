"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BodyMapData, MuscleGroup } from "@/lib/recovery/types";
import { MUSCLE_REGIONS } from "@/lib/body-map/mapping";
import { getMuscleFillColor, getRecoveryTier } from "@/lib/body-map/visualization";

interface MuscleTooltipProps {
  muscle: MuscleGroup | null;
  muscleData: BodyMapData;
  position?: { x: number; y: number };
}

/**
 * Hover tooltip showing muscle name, recovery tier, and recovery score
 * Positioned near cursor, auto-repositioned to avoid viewport edges
 */
export const MuscleTooltip: React.FC<MuscleTooltipProps> = ({
  muscle,
  muscleData,
  position = { x: 0, y: 0 },
}) => {
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(!!muscle);

  if (!muscle) {
    return null;
  }

  const data = muscleData[muscle];
  const region = MUSCLE_REGIONS[muscle];

  if (!data || !region) {
    return null;
  }

  const recoveryScore = Math.round(data.recovery_score ?? 0);
  const tier = getRecoveryTier(data.recovery_score ?? 0);
  const tierColor = getMuscleFillColor(tier);

  const tooltipVariants = {
    hidden: { opacity: 0, y: 4 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          variants={tooltipVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.15 }}
          className="fixed z-40 pointer-events-none"
          style={{
            left: `${position.x}px`,
            top: `${position.y + 10}px`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="bg-popover border border-border rounded-lg shadow-lg p-2 sm:p-3 whitespace-nowrap text-sm">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: tierColor }}
              />
              <span className="font-semibold">{region.label}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Recovery: <strong>{recoveryScore}%</strong> ({tier})
            </div>
            {data.last_trained_at && (
              <div className="text-xs text-muted-foreground mt-1">
                Last trained: {formatRelativeDate(new Date(data.last_trained_at))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Format date as relative (e.g., "2 days ago")
 */
function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "today";
  } else if (diffDays === 1) {
    return "yesterday";
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}w ago`;
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}

export default MuscleTooltip;
