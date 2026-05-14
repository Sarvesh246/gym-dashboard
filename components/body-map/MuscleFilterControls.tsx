"use client";

import React from "react";
import { motion } from "framer-motion";

type TimeRange = "7d" | "14d" | "30d";

interface MuscleFilterControlsProps {
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  isLoading?: boolean;
}

/**
 * Filter controls for time-range selection
 * Shows 7d / 14d / 30d toggle buttons
 */
export const MuscleFilterControls: React.FC<MuscleFilterControlsProps> = ({
  selectedRange,
  onRangeChange,
  isLoading = false,
}) => {
  const ranges: { value: TimeRange; label: string }[] = [
    { value: "7d", label: "7 Days" },
    { value: "14d", label: "14 Days" },
    { value: "30d", label: "30 Days" },
  ];

  return (
    <div className="flex gap-2 justify-center">
      {ranges.map((range) => (
        <motion.button
          key={range.value}
          onClick={() => onRangeChange(range.value)}
          disabled={isLoading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            selectedRange === range.value
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {range.label}
        </motion.button>
      ))}
    </div>
  );
};

export default MuscleFilterControls;
