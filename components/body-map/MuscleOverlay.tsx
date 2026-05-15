"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MuscleGroup } from "@/lib/recovery/types";
import { MUSCLE_REGIONS } from "@/lib/body-map/mapping";
import { getMuscleFillColor, getRecoveryTier } from "@/lib/body-map/visualization";
import type { BodyMapMuscleData } from "@/lib/recovery/types";

interface MuscleOverlayProps {
  selectedMuscle: MuscleGroup | null;
  muscleData: Partial<Record<MuscleGroup, BodyMapMuscleData>>;
  /** Whether any muscle has been interacted with yet */
  hasInteracted: boolean;
}

/**
 * Overlay rendered beneath/around the SVG canvas.
 * On desktop shows a subtle "Select a muscle" hint when nothing is chosen.
 * When a muscle is selected, fades in the muscle name as a brief confirmation chip.
 */
export const MuscleOverlay: React.FC<MuscleOverlayProps> = ({
  selectedMuscle,
  muscleData,
  hasInteracted,
}) => {
  const region   = selectedMuscle ? MUSCLE_REGIONS[selectedMuscle] : null;
  const data     = selectedMuscle ? muscleData[selectedMuscle] : null;
  const tier     = data ? getRecoveryTier(data.recovery_score ?? 0) : "gray";
  const dotColor = getMuscleFillColor(tier);

  return (
    <div className="pointer-events-none select-none">
      <AnimatePresence mode="wait">
        {!selectedMuscle && !hasInteracted && (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            className="text-center text-xs text-muted-foreground/60 mt-2"
          >
            Tap a muscle to explore its recovery data
          </motion.p>
        )}

        {selectedMuscle && region && (
          <motion.div
            key={selectedMuscle}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center gap-2 mt-2"
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: dotColor }}
            />
            <span className="text-xs font-medium text-foreground/70">
              {region.label}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MuscleOverlay;
