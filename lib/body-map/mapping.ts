/**
 * Body Map Muscle Mapping Layer
 * Defines SVG coordinate system, muscle regions, and agonist/antagonist pairs
 * Front-facing minimalist geometric silhouette (viewBox: 0 0 100 200)
 */

import { MuscleGroup } from "@/lib/recovery/types";

export interface MuscleRegion {
  id: string;
  name: MuscleGroup;
  label: string; // Display name
  svgElement: "circle" | "ellipse" | "polygon" | "path" | "rect";
  // SVG coordinates (viewBox: 0 0 100 200)
  cx?: number; // center x for circle/ellipse
  cy?: number; // center y for circle/ellipse
  r?: number; // radius for circle
  rx?: number; // x radius for ellipse
  ry?: number; // y radius for ellipse
  points?: string; // polygon points
  d?: string; // SVG path
  width?: number; // for rect
  height?: number; // for rect
  x?: number; // rect x
  y?: number; // rect y
  // For hit detection
  viewBoxCoords: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Minimalist geometric front-body silhouette
 * Viewbox: 0 0 100 200 (100 wide, 200 tall)
 *
 * Layout:
 * - Head area: 0-30px
 * - Shoulders/upper back: 30-70px
 * - Core/midsection: 40-120px
 * - Legs: 120-200px
 */
export const MUSCLE_REGIONS: Record<MuscleGroup, MuscleRegion> = {
  // Upper Body
  chest: {
    id: "chest",
    name: "chest",
    label: "Chest",
    svgElement: "ellipse",
    cx: 50,
    cy: 60,
    rx: 18,
    ry: 22,
    viewBoxCoords: { x: 32, y: 38, width: 36, height: 44 },
  },
  upper_chest: {
    id: "upper_chest",
    name: "upper_chest",
    label: "Upper Chest",
    svgElement: "ellipse",
    cx: 50,
    cy: 45,
    rx: 18,
    ry: 12,
    viewBoxCoords: { x: 32, y: 33, width: 36, height: 24 },
  },
  front_delts: {
    id: "front_delts",
    name: "front_delts",
    label: "Front Delts",
    svgElement: "circle",
    cx: 25,
    cy: 50,
    r: 8,
    viewBoxCoords: { x: 17, y: 42, width: 16, height: 16 },
  },
  side_delts: {
    id: "side_delts",
    name: "side_delts",
    label: "Side Delts",
    svgElement: "circle",
    cx: 20,
    cy: 55,
    r: 7,
    viewBoxCoords: { x: 13, y: 48, width: 14, height: 14 },
  },
  rear_delts: {
    id: "rear_delts",
    name: "rear_delts",
    label: "Rear Delts",
    svgElement: "circle",
    cx: 15,
    cy: 58,
    r: 6,
    viewBoxCoords: { x: 9, y: 52, width: 12, height: 12 },
  },
  biceps: {
    id: "biceps",
    name: "biceps",
    label: "Biceps",
    svgElement: "ellipse",
    cx: 30,
    cy: 75,
    rx: 6,
    ry: 16,
    viewBoxCoords: { x: 24, y: 59, width: 12, height: 32 },
  },
  triceps: {
    id: "triceps",
    name: "triceps",
    label: "Triceps",
    svgElement: "ellipse",
    cx: 70,
    cy: 75,
    rx: 6,
    ry: 16,
    viewBoxCoords: { x: 64, y: 59, width: 12, height: 32 },
  },
  forearms: {
    id: "forearms",
    name: "forearms",
    label: "Forearms",
    svgElement: "ellipse",
    cx: 50,
    cy: 100,
    rx: 8,
    ry: 18,
    viewBoxCoords: { x: 42, y: 82, width: 16, height: 36 },
  },

  // Back/Posterior (represented on sides for front view)
  upper_back: {
    id: "upper_back",
    name: "upper_back",
    label: "Upper Back",
    svgElement: "ellipse",
    cx: 50,
    cy: 52,
    rx: 20,
    ry: 18,
    viewBoxCoords: { x: 30, y: 34, width: 40, height: 36 },
  },
  traps: {
    id: "traps",
    name: "traps",
    label: "Traps",
    svgElement: "polygon",
    points: "40,30 60,30 55,55 45,55",
    viewBoxCoords: { x: 35, y: 25, width: 30, height: 35 },
  },
  lats: {
    id: "lats",
    name: "lats",
    label: "Lats",
    svgElement: "ellipse",
    cx: 50,
    cy: 85,
    rx: 22,
    ry: 20,
    viewBoxCoords: { x: 28, y: 65, width: 44, height: 40 },
  },
  lower_back: {
    id: "lower_back",
    name: "lower_back",
    label: "Lower Back",
    svgElement: "ellipse",
    cx: 50,
    cy: 105,
    rx: 20,
    ry: 16,
    viewBoxCoords: { x: 30, y: 89, width: 40, height: 32 },
  },

  // Core
  core: {
    id: "core",
    name: "core",
    label: "Core",
    svgElement: "ellipse",
    cx: 50,
    cy: 95,
    rx: 14,
    ry: 18,
    viewBoxCoords: { x: 36, y: 77, width: 28, height: 36 },
  },

  // Lower Body
  glutes: {
    id: "glutes",
    name: "glutes",
    label: "Glutes",
    svgElement: "ellipse",
    cx: 50,
    cy: 125,
    rx: 20,
    ry: 14,
    viewBoxCoords: { x: 30, y: 111, width: 40, height: 28 },
  },
  quads: {
    id: "quads",
    name: "quads",
    label: "Quads",
    svgElement: "ellipse",
    cx: 50,
    cy: 155,
    rx: 16,
    ry: 25,
    viewBoxCoords: { x: 34, y: 130, width: 32, height: 50 },
  },
  hamstrings: {
    id: "hamstrings",
    name: "hamstrings",
    label: "Hamstrings",
    svgElement: "ellipse",
    cx: 50,
    cy: 160,
    rx: 16,
    ry: 22,
    viewBoxCoords: { x: 34, y: 138, width: 32, height: 44 },
  },
  calves: {
    id: "calves",
    name: "calves",
    label: "Calves",
    svgElement: "ellipse",
    cx: 50,
    cy: 180,
    rx: 12,
    ry: 15,
    viewBoxCoords: { x: 38, y: 165, width: 24, height: 30 },
  },
};

/**
 * Agonist/Antagonist muscle pairs for imbalance detection
 * Maps opposing muscle groups that should maintain balance
 */
export interface MusclePair {
  pairType: "push_pull" | "leg_balance" | "arm_balance" | "shoulder_balance";
  label: string;
  primary: MuscleGroup;
  secondary: MuscleGroup;
  recommendedRatio: number; // target ratio (primary / secondary)
  severity: {
    mild: { min: number; max: number };
    moderate: { min: number; max: number };
    severe: { min: number; max: number };
  };
}

export const MUSCLE_PAIRS: Record<string, MusclePair> = {
  "push_pull": {
    pairType: "push_pull",
    label: "Push vs Pull (Chest vs Back)",
    primary: "chest",
    secondary: "upper_back",
    recommendedRatio: 1.0,
    severity: {
      mild: { min: 0.5, max: 2.0 },
      moderate: { min: 0.4, max: 2.5 },
      severe: { min: 0.3, max: 3.5 },
    },
  },
  "leg_balance": {
    pairType: "leg_balance",
    label: "Leg Balance (Quads vs Hamstrings)",
    primary: "quads",
    secondary: "hamstrings",
    recommendedRatio: 1.0,
    severity: {
      mild: { min: 0.5, max: 2.0 },
      moderate: { min: 0.4, max: 2.5 },
      severe: { min: 0.3, max: 3.5 },
    },
  },
  "arm_balance": {
    pairType: "arm_balance",
    label: "Arm Balance (Biceps vs Triceps)",
    primary: "biceps",
    secondary: "triceps",
    recommendedRatio: 1.0,
    severity: {
      mild: { min: 0.5, max: 2.0 },
      moderate: { min: 0.4, max: 2.5 },
      severe: { min: 0.3, max: 3.5 },
    },
  },
  "shoulder_balance": {
    pairType: "shoulder_balance",
    label: "Shoulder Balance (Front vs Rear Delts)",
    primary: "front_delts",
    secondary: "rear_delts",
    recommendedRatio: 1.0,
    severity: {
      mild: { min: 0.5, max: 2.0 },
      moderate: { min: 0.4, max: 2.5 },
      severe: { min: 0.3, max: 3.5 },
    },
  },
};

/**
 * All visible body-map muscles in display order
 * Used for rendering bars, lists, and queries
 */
export const BODY_MAP_MUSCLES: MuscleGroup[] = [
  "chest",
  "upper_chest",
  "front_delts",
  "side_delts",
  "rear_delts",
  "biceps",
  "triceps",
  "forearms",
  "upper_back",
  "lats",
  "traps",
  "lower_back",
  "core",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
];

/**
 * Get muscle region by name
 */
export function getMuscleRegion(muscleName: MuscleGroup): MuscleRegion | undefined {
  return MUSCLE_REGIONS[muscleName];
}

/**
 * Get all muscle pairs
 */
export function getAllMusclePairs(): MusclePair[] {
  return Object.values(MUSCLE_PAIRS);
}

/**
 * Get pairs for a specific muscle (both as primary and secondary)
 */
export function getPairsForMuscle(muscleName: MuscleGroup): MusclePair[] {
  return Object.values(MUSCLE_PAIRS).filter(
    (pair) => pair.primary === muscleName || pair.secondary === muscleName
  );
}

/**
 * Check if point (x, y) is within a muscle region (for hit detection)
 * Simple bounding box check based on viewBoxCoords
 */
export function isMuscleRegionHit(
  muscleName: MuscleGroup,
  x: number,
  y: number
): boolean {
  const region = getMuscleRegion(muscleName);
  if (!region) return false;

  const { x: regionX, y: regionY, width, height } = region.viewBoxCoords;
  return x >= regionX && x <= regionX + width && y >= regionY && y <= regionY + height;
}

/**
 * Find muscle at viewport coordinates
 * Requires SVG DOM element for coordinate transformation
 */
export function findMuscleAtPoint(svgElement: SVGElement, x: number, y: number): MuscleGroup | null {
  const rect = svgElement.getBoundingClientRect();
  const svgX = ((x - rect.left) / rect.width) * 100; // viewBox width is 100
  const svgY = ((y - rect.top) / rect.height) * 200; // viewBox height is 200

  for (const muscleName of BODY_MAP_MUSCLES) {
    if (isMuscleRegionHit(muscleName as MuscleGroup, svgX, svgY)) {
      return muscleName as MuscleGroup;
    }
  }
  return null;
}

/**
 * Map exercise muscles to agonist/antagonist pairs for quick lookups
 */
export function getMuscleImbalancePair(muscleName: MuscleGroup): MusclePair | undefined {
  for (const pair of Object.values(MUSCLE_PAIRS)) {
    if (pair.primary === muscleName || pair.secondary === muscleName) {
      return pair;
    }
  }
  return undefined;
}
