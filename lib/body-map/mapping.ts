/**
 * Body Map Muscle Mapping Layer
 * Front-facing bilateral silhouette, viewBox 0 0 100 220
 * Each muscle group can have multiple shapes (bilateral muscles appear on both sides)
 */

import { MuscleGroup } from "@/lib/recovery/types";

export interface MuscleShape {
  svgElement: "circle" | "ellipse" | "polygon" | "path" | "rect";
  cx?: number;
  cy?: number;
  r?: number;
  rx?: number;
  ry?: number;
  points?: string;
  d?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface MuscleRegion {
  id: string;
  name: MuscleGroup;
  label: string;
  shapes: MuscleShape[];
  // Bounding box for hit detection (viewBox coordinates)
  viewBoxCoords: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Body layout (viewBox 0 0 100 220):
 *
 *  Head:         cx=50  cy=10   r=8.5
 *  Neck:         x=46–54        y=18–27
 *  Torso:        x=16–84 (shoulder) → x=26–74 (hip)  y=27–112
 *  Left arm:     x=10–19        y=27–130
 *  Right arm:    x=81–90        y=27–130
 *  Left leg:     x=26–44        y=112–215
 *  Right leg:    x=56–74        y=112–215
 *
 *  Arm centre x: Left=14, Right=86
 *  Leg centre x: Left=35, Right=65
 */
export const MUSCLE_REGIONS: Record<MuscleGroup, MuscleRegion> = {
  // ── Chest ──────────────────────────────────────────────────────────────
  chest: {
    id: "chest",
    name: "chest",
    label: "Chest",
    shapes: [
      { svgElement: "ellipse", cx: 36, cy: 53, rx: 9, ry: 12 },
      { svgElement: "ellipse", cx: 64, cy: 53, rx: 9, ry: 12 },
    ],
    viewBoxCoords: { x: 27, y: 41, width: 46, height: 24 },
  },
  upper_chest: {
    id: "upper_chest",
    name: "upper_chest",
    label: "Upper Chest",
    shapes: [
      { svgElement: "ellipse", cx: 36, cy: 39, rx: 9, ry: 7 },
      { svgElement: "ellipse", cx: 64, cy: 39, rx: 9, ry: 7 },
    ],
    viewBoxCoords: { x: 27, y: 32, width: 46, height: 14 },
  },

  // ── Shoulders ──────────────────────────────────────────────────────────
  front_delts: {
    id: "front_delts",
    name: "front_delts",
    label: "Front Delts",
    shapes: [
      { svgElement: "ellipse", cx: 21, cy: 33, rx: 7, ry: 7 },
      { svgElement: "ellipse", cx: 79, cy: 33, rx: 7, ry: 7 },
    ],
    viewBoxCoords: { x: 14, y: 26, width: 72, height: 14 },
  },
  side_delts: {
    id: "side_delts",
    name: "side_delts",
    label: "Side Delts",
    shapes: [
      { svgElement: "ellipse", cx: 12, cy: 40, rx: 4, ry: 8 },
      { svgElement: "ellipse", cx: 88, cy: 40, rx: 4, ry: 8 },
    ],
    viewBoxCoords: { x: 8, y: 32, width: 80, height: 16 },
  },
  rear_delts: {
    id: "rear_delts",
    name: "rear_delts",
    label: "Rear Delts",
    shapes: [
      { svgElement: "ellipse", cx: 12, cy: 30, rx: 4, ry: 5 },
      { svgElement: "ellipse", cx: 88, cy: 30, rx: 4, ry: 5 },
    ],
    viewBoxCoords: { x: 8, y: 25, width: 80, height: 10 },
  },

  // ── Upper back (visible from front as back layer) ──────────────────────
  traps: {
    id: "traps",
    name: "traps",
    label: "Traps",
    shapes: [
      { svgElement: "polygon", points: "44,21 56,21 63,32 37,32" },
    ],
    viewBoxCoords: { x: 37, y: 21, width: 26, height: 11 },
  },
  upper_back: {
    id: "upper_back",
    name: "upper_back",
    label: "Upper Back",
    shapes: [
      { svgElement: "ellipse", cx: 50, cy: 50, rx: 15, ry: 15 },
    ],
    viewBoxCoords: { x: 35, y: 35, width: 30, height: 30 },
  },

  // ── Arms ───────────────────────────────────────────────────────────────
  biceps: {
    id: "biceps",
    name: "biceps",
    label: "Biceps",
    shapes: [
      { svgElement: "ellipse", cx: 14, cy: 59, rx: 3.5, ry: 13 },
      { svgElement: "ellipse", cx: 86, cy: 59, rx: 3.5, ry: 13 },
    ],
    viewBoxCoords: { x: 10, y: 46, width: 76, height: 26 },
  },
  triceps: {
    id: "triceps",
    name: "triceps",
    label: "Triceps",
    shapes: [
      { svgElement: "ellipse", cx: 11, cy: 61, rx: 3, ry: 12 },
      { svgElement: "ellipse", cx: 89, cy: 61, rx: 3, ry: 12 },
    ],
    viewBoxCoords: { x: 8, y: 49, width: 80, height: 24 },
  },
  forearms: {
    id: "forearms",
    name: "forearms",
    label: "Forearms",
    shapes: [
      { svgElement: "ellipse", cx: 14, cy: 104, rx: 3, ry: 14 },
      { svgElement: "ellipse", cx: 86, cy: 104, rx: 3, ry: 14 },
    ],
    viewBoxCoords: { x: 10, y: 90, width: 76, height: 28 },
  },

  // ── Lats (sides of torso, visible from front) ─────────────────────────
  lats: {
    id: "lats",
    name: "lats",
    label: "Lats",
    shapes: [
      { svgElement: "ellipse", cx: 24, cy: 75, rx: 8, ry: 21 },
      { svgElement: "ellipse", cx: 76, cy: 75, rx: 8, ry: 21 },
    ],
    viewBoxCoords: { x: 16, y: 54, width: 58, height: 42 },
  },

  // ── Core / Lower torso ────────────────────────────────────────────────
  lower_back: {
    id: "lower_back",
    name: "lower_back",
    label: "Lower Back",
    shapes: [
      { svgElement: "ellipse", cx: 50, cy: 100, rx: 10, ry: 9 },
    ],
    viewBoxCoords: { x: 40, y: 91, width: 20, height: 18 },
  },
  core: {
    id: "core",
    name: "core",
    label: "Core",
    shapes: [
      { svgElement: "ellipse", cx: 50, cy: 83, rx: 11, ry: 17 },
    ],
    viewBoxCoords: { x: 39, y: 66, width: 22, height: 34 },
  },

  // ── Lower body ─────────────────────────────────────────────────────────
  glutes: {
    id: "glutes",
    name: "glutes",
    label: "Glutes",
    shapes: [
      { svgElement: "ellipse", cx: 35, cy: 117, rx: 10, ry: 9 },
      { svgElement: "ellipse", cx: 65, cy: 117, rx: 10, ry: 9 },
    ],
    viewBoxCoords: { x: 25, y: 108, width: 50, height: 18 },
  },
  quads: {
    id: "quads",
    name: "quads",
    label: "Quads",
    shapes: [
      { svgElement: "ellipse", cx: 35, cy: 150, rx: 9, ry: 25 },
      { svgElement: "ellipse", cx: 65, cy: 150, rx: 9, ry: 25 },
    ],
    viewBoxCoords: { x: 26, y: 125, width: 48, height: 50 },
  },
  hamstrings: {
    id: "hamstrings",
    name: "hamstrings",
    label: "Hamstrings",
    shapes: [
      { svgElement: "ellipse", cx: 35, cy: 149, rx: 8, ry: 23 },
      { svgElement: "ellipse", cx: 65, cy: 149, rx: 8, ry: 23 },
    ],
    viewBoxCoords: { x: 27, y: 126, width: 46, height: 46 },
  },
  calves: {
    id: "calves",
    name: "calves",
    label: "Calves",
    shapes: [
      { svgElement: "ellipse", cx: 35, cy: 193, rx: 6.5, ry: 14 },
      { svgElement: "ellipse", cx: 65, cy: 193, rx: 6.5, ry: 14 },
    ],
    viewBoxCoords: { x: 28, y: 179, width: 44, height: 28 },
  },
};

// ── Agonist / antagonist pairs ────────────────────────────────────────────

export interface MusclePair {
  pairType: "push_pull" | "leg_balance" | "arm_balance" | "shoulder_balance";
  label: string;
  primary: MuscleGroup;
  secondary: MuscleGroup;
  recommendedRatio: number;
  severity: {
    mild: { min: number; max: number };
    moderate: { min: number; max: number };
    severe: { min: number; max: number };
  };
}

export const MUSCLE_PAIRS: Record<string, MusclePair> = {
  push_pull: {
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
  leg_balance: {
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
  arm_balance: {
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
  shoulder_balance: {
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

/** All muscle groups in render order (back layers first) */
export const BODY_MAP_MUSCLES: MuscleGroup[] = [
  // Back-layer muscles (render first, appear behind front muscles)
  "upper_back",
  "lower_back",
  "rear_delts",
  "hamstrings",
  // Mid-layer
  "lats",
  "traps",
  "glutes",
  // Front-layer muscles
  "chest",
  "upper_chest",
  "front_delts",
  "side_delts",
  "core",
  "biceps",
  "triceps",
  "forearms",
  "quads",
  "calves",
];

export function getMuscleRegion(muscleName: MuscleGroup): MuscleRegion | undefined {
  return MUSCLE_REGIONS[muscleName];
}

export function getAllMusclePairs(): MusclePair[] {
  return Object.values(MUSCLE_PAIRS);
}

export function getPairsForMuscle(muscleName: MuscleGroup): MusclePair[] {
  return Object.values(MUSCLE_PAIRS).filter(
    (pair) => pair.primary === muscleName || pair.secondary === muscleName
  );
}

export function isMuscleRegionHit(muscleName: MuscleGroup, x: number, y: number): boolean {
  const region = getMuscleRegion(muscleName);
  if (!region) return false;
  const { x: rx, y: ry, width, height } = region.viewBoxCoords;
  return x >= rx && x <= rx + width && y >= ry && y <= ry + height;
}

export function findMuscleAtPoint(svgElement: SVGElement, x: number, y: number): MuscleGroup | null {
  const rect = svgElement.getBoundingClientRect();
  const svgX = ((x - rect.left) / rect.width) * 100;
  const svgY = ((y - rect.top) / rect.height) * 220;

  for (const muscleName of BODY_MAP_MUSCLES) {
    if (isMuscleRegionHit(muscleName as MuscleGroup, svgX, svgY)) {
      return muscleName as MuscleGroup;
    }
  }
  return null;
}

export function getMuscleImbalancePair(muscleName: MuscleGroup): MusclePair | undefined {
  for (const pair of Object.values(MUSCLE_PAIRS)) {
    if (pair.primary === muscleName || pair.secondary === muscleName) {
      return pair;
    }
  }
  return undefined;
}
