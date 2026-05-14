/**
 * Body Map Visual Encoding Layer
 * Transforms numeric recovery/fatigue scores into visual properties
 * Color mapping, opacity scaling, stroke width emphasis, subtle glow effects
 */

import { RecoveryTier } from "@/lib/recovery/types";

/**
 * Recovery tier color definitions (hex)
 * Green: fully recovered and ready
 * Yellow: moderate fatigue, still trainable
 * Orange: high fatigue, reduced capacity
 * Red: overloaded, needs recovery
 */
export const TIER_COLORS: Record<RecoveryTier | "gray", string> = {
  green: "#22C55E",
  yellow: "#F59E0B",
  orange: "#F97316",
  red: "#EF4444",
  gray: "#9CA3AF", // no data
};

/**
 * Get fill color (hex) for a muscle based on recovery tier
 * Maintains consistency with existing recovery tier system
 */
export function getMuscleFillColor(tier: RecoveryTier | "gray"): string {
  return TIER_COLORS[tier];
}

/**
 * Map recovery score (0-100) to recovery tier
 * Aligned with lib/recovery/constants.ts thresholds
 */
export function getRecoveryTier(recoveryScore: number): RecoveryTier | "gray" {
  if (recoveryScore === undefined || recoveryScore === null) return "gray";
  if (recoveryScore >= 85) return "green";
  if (recoveryScore >= 65) return "yellow";
  if (recoveryScore >= 40) return "orange";
  return "red";
}

/**
 * Calculate opacity based on fatigue score
 * Low fatigue (recovered): light opacity
 * High fatigue (overloaded): full opacity
 * Range: 0.3 (light) to 1.0 (fully saturated)
 */
export function getFatigueOpacity(fatigueScore: number): number {
  if (fatigueScore === undefined || fatigueScore === null) return 0.3;
  // Normalize fatigue 0-100 to opacity 0.3-1.0
  const normalized = Math.max(0, Math.min(100, fatigueScore)) / 100;
  return 0.3 + normalized * 0.7; // 0.3 + (0-1) * 0.7
}

/**
 * Calculate stroke width based on fatigue score
 * Light fatigue: thin stroke (1px)
 * High fatigue: thick stroke (2.5px)
 * Emphasizes overworked muscles visually
 */
export function getFatigueStrokeWidth(fatigueScore: number): number {
  if (fatigueScore === undefined || fatigueScore === null) return 1;
  const normalized = Math.max(0, Math.min(100, fatigueScore)) / 100;
  return 1 + normalized * 1.5; // 1 + (0-1) * 1.5 → 1 to 2.5
}

/**
 * Calculate subtle glow effect (box-shadow) for high-fatigue muscles
 * Max 8px blur, low opacity, color-based on tier
 * Used on SVG elements for depth without flashiness
 */
export function getGlowEffect(
  fatigueScore: number,
  tier: RecoveryTier | "gray"
): { boxShadow: string } | null {
  // Only apply glow to high-fatigue muscles (fatigueScore > 60)
  if (fatigueScore === undefined || fatigueScore === null || fatigueScore <= 60) {
    return null;
  }

  const color = getMuscleFillColor(tier);
  // Parse hex to RGB for shadow (e.g., #EF4444 → rgb(239, 68, 68))
  const rgb = hexToRgb(color);
  if (!rgb) return null;

  // Glow intensity increases with fatigue
  const normalized = Math.max(0, Math.min(100, fatigueScore)) / 100;
  const opacity = 0.15 + normalized * 0.15; // 0.15 to 0.3 opacity
  const blurRadius = 6 + normalized * 2; // 6 to 8px blur

  return {
    boxShadow: `0 0 ${blurRadius}px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`,
  };
}

/**
 * Helper: convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Saturation class for light/dark mode awareness
 * Dark mode may need reduced saturation for readability
 */
export function getSaturationClass(isDarkMode: boolean): string {
  return isDarkMode ? "saturate-75" : "saturate-100";
}

/**
 * Build complete style object for a muscle region
 * Combines color, opacity, stroke, and glow
 */
export interface MuscleVisualStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  filter?: string; // For glow effects if using SVG filters
  boxShadow?: string; // For DOM element glow
}

export function getMuscleVisualStyle(
  recoveryScore: number,
  fatigueScore: number,
  options?: {
    strokeColor?: string; // Override default tier-based stroke
    isDarkMode?: boolean;
  }
): MuscleVisualStyle {
  const tier = getRecoveryTier(recoveryScore);
  const fillColor = getMuscleFillColor(tier);
  const opacity = getFatigueOpacity(fatigueScore);
  const strokeWidth = getFatigueStrokeWidth(fatigueScore);
  const glow = getGlowEffect(fatigueScore, tier);

  return {
    fill: fillColor,
    stroke: options?.strokeColor || fillColor,
    strokeWidth,
    opacity,
    ...(glow && { boxShadow: glow.boxShadow }),
  };
}

/**
 * Tailwind classes for muscle UI elements
 * Used for styling in components without direct style objects
 */
export function getMuscleColorClasses(
  tier: RecoveryTier | "gray"
): {
  bg: string;
  text: string;
  border: string;
  ring: string;
} {
  switch (tier) {
    case "green":
      return {
        bg: "bg-green-500",
        text: "text-green-900",
        border: "border-green-600",
        ring: "ring-green-500",
      };
    case "yellow":
      return {
        bg: "bg-yellow-500",
        text: "text-yellow-900",
        border: "border-yellow-600",
        ring: "ring-yellow-500",
      };
    case "orange":
      return {
        bg: "bg-orange-500",
        text: "text-orange-900",
        border: "border-orange-600",
        ring: "ring-orange-500",
      };
    case "red":
      return {
        bg: "bg-red-500",
        text: "text-red-900",
        border: "border-red-600",
        ring: "ring-red-500",
      };
    case "gray":
      return {
        bg: "bg-gray-400",
        text: "text-gray-900",
        border: "border-gray-500",
        ring: "ring-gray-400",
      };
  }
}

/**
 * Format recovery score for display
 * Shows value with color indicator
 */
export function formatRecoveryScore(score: number | null | undefined): string {
  if (score === undefined || score === null) return "—";
  return Math.round(score).toString();
}

/**
 * Get recovery status description based on score
 */
export function getRecoveryStatusDescription(recoveryScore: number): string {
  if (recoveryScore >= 85) return "Fully recovered";
  if (recoveryScore >= 65) return "Moderately recovered";
  if (recoveryScore >= 40) return "Fatigued";
  return "Overloaded";
}

/**
 * Get training readiness description for a muscle
 */
export function getMuscleTrainingReadiness(recoveryScore: number, fatigueScore: number): string {
  const tier = getRecoveryTier(recoveryScore);

  if (tier === "green") {
    return "Ready for high-intensity training";
  } else if (tier === "yellow") {
    if (fatigueScore > 70) {
      return "Ready for moderate-intensity training";
    }
    return "Ready for standard training";
  } else if (tier === "orange") {
    return "Consider reduced volume or intensity";
  } else {
    return "Recommend active recovery or rest";
  }
}

/**
 * Calculate visual intensity (0-1) for animations or effects
 * Used for hover states, emphasis, etc.
 */
export function getVisualIntensity(fatigueScore: number): number {
  return Math.max(0, Math.min(100, fatigueScore)) / 100;
}

/**
 * Determine if a muscle should show as "stressed" (visual emphasis)
 * Returns true if fatigue is high or recovery is low
 */
export function isMuscleStressed(recoveryScore: number, fatigueScore: number): boolean {
  const tier = getRecoveryTier(recoveryScore);
  return tier === "orange" || tier === "red";
}

/**
 * Get tooltip background color (for hover states)
 */
export function getTooltipBgColor(tier: RecoveryTier | "gray"): string {
  // Slightly darker version of tier color
  const colorMap = {
    green: "bg-green-600",
    yellow: "bg-amber-600",
    orange: "bg-orange-600",
    red: "bg-red-600",
    gray: "bg-gray-500",
  };
  return colorMap[tier];
}
