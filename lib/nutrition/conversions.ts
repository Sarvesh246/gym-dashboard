// Serving size conversions and unit normalization

import { SERVING_CONVERSIONS, SERVING_UNIT_ALIASES } from "./constants";

/**
 * Normalize a unit string to its canonical form (e.g. "grams" → "g").
 */
export function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase().trim();
  return SERVING_UNIT_ALIASES[lower] ?? lower;
}

/**
 * Convert an amount from one unit to grams.
 * Returns null if the conversion is not defined (e.g. "unit").
 */
export function toGrams(amount: number, unit: string): number | null {
  const canonical = normalizeUnit(unit);
  const factor = SERVING_CONVERSIONS[canonical];
  if (factor == null) return null;
  return parseFloat((amount * factor).toFixed(2));
}

/**
 * Scale macro values by a multiplier (e.g. 1.5 servings).
 */
export function scaleMacros(
  base: { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g?: number },
  multiplier: number
): { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number } {
  return {
    calories: Math.round(base.calories * multiplier),
    protein_g: parseFloat((base.protein_g * multiplier).toFixed(1)),
    carbs_g: parseFloat((base.carbs_g * multiplier).toFixed(1)),
    fat_g: parseFloat((base.fat_g * multiplier).toFixed(1)),
    fiber_g: parseFloat(((base.fiber_g ?? 0) * multiplier).toFixed(1)),
  };
}

/**
 * Calculate the serving multiplier when a user changes size or servings count.
 * @param originalSize Original serving size from the food data
 * @param newSize User-selected size
 * @param servingsCount Number of servings (default 1)
 */
export function servingMultiplier(
  originalSize: number,
  newSize: number,
  servingsCount: number = 1
): number {
  if (originalSize <= 0) return servingsCount;
  return servingsCount * (newSize / originalSize);
}

/**
 * Format a decimal number for display (strips trailing zeros).
 */
export function formatServing(value: number): string {
  return value % 1 === 0 ? value.toString() : value.toFixed(1);
}

/**
 * Convert ml to cups/oz for display when useful.
 */
export function mlToOz(ml: number): number {
  return parseFloat((ml / 29.5735).toFixed(1));
}

export function mlToCups(ml: number): number {
  return parseFloat((ml / 240).toFixed(2));
}

/**
 * Hydration quick-add presets in ml.
 */
export const HYDRATION_PRESETS_ML: Record<string, number> = {
  "Small glass (200ml)": 200,
  "Glass (250ml)": 250,
  "Large glass (350ml)": 350,
  "Bottle (500ml)": 500,
  "Large bottle (750ml)": 750,
  "1 Litre": 1000,
};
