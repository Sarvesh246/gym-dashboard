// Pure functions for trend analysis: rolling averages, deltas, smoothing.
// No side effects, no DB access — all deterministic math.

export interface TrendPoint {
  date: string;
  value: number;
}

export interface TrendResult {
  current: number;
  previous: number;
  delta: number;
  deltaPct: number;
  direction: "up" | "down" | "flat";
  rollingAvg7: number;
  rollingAvg14: number;
}

export interface ConsistencyResult {
  totalDays: number;
  activeDays: number;
  consistencyPct: number;
  longestStreak: number;
  currentStreak: number;
}

/** Simple moving average over the last N points. */
export function rollingAverage(points: TrendPoint[], windowDays: number): number {
  if (points.length === 0) return 0;
  const window = points.slice(-windowDays);
  const sum = window.reduce((acc, p) => acc + p.value, 0);
  return sum / window.length;
}

/** Exponential weighted moving average (alpha = 2/(n+1)). */
export function ewma(points: TrendPoint[], span: number): number {
  if (points.length === 0) return 0;
  const alpha = 2 / (span + 1);
  return points.reduce((acc, p, i) => {
    return i === 0 ? p.value : alpha * p.value + (1 - alpha) * acc;
  }, 0);
}

/**
 * Compute full trend analysis between two periods.
 * Split points at midpoint: first half = "previous", second half = "current".
 */
export function analyzeTrend(points: TrendPoint[]): TrendResult {
  if (points.length === 0) {
    return { current: 0, previous: 0, delta: 0, deltaPct: 0, direction: "flat", rollingAvg7: 0, rollingAvg14: 0 };
  }

  const mid = Math.floor(points.length / 2);
  const prevPoints = points.slice(0, mid);
  const curPoints = points.slice(mid);

  const previous = prevPoints.length > 0 ? prevPoints.reduce((a, p) => a + p.value, 0) / prevPoints.length : 0;
  const current = curPoints.length > 0 ? curPoints.reduce((a, p) => a + p.value, 0) / curPoints.length : 0;
  const delta = current - previous;
  const deltaPct = previous !== 0 ? (delta / Math.abs(previous)) * 100 : 0;

  const direction: "up" | "down" | "flat" =
    Math.abs(deltaPct) < 2 ? "flat" : delta > 0 ? "up" : "down";

  return {
    current,
    previous,
    delta,
    deltaPct,
    direction,
    rollingAvg7: rollingAverage(points, 7),
    rollingAvg14: rollingAverage(points, 14),
  };
}

/**
 * Detect if a series is stagnant: all values within ±threshold% of the mean.
 */
export function isStagnant(points: TrendPoint[], thresholdPct = 3): boolean {
  if (points.length < 3) return false;
  const values = points.map((p) => p.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return false;
  return values.every((v) => Math.abs((v - mean) / mean) * 100 <= thresholdPct);
}

/** Compute training consistency from a list of dated activity flags. */
export function computeConsistency(
  dates: string[],
  activeDates: Set<string>,
  windowDays = 7
): ConsistencyResult {
  const sorted = [...dates].sort();
  const window = sorted.slice(-windowDays);
  const activeDays = window.filter((d) => activeDates.has(d)).length;

  let longestStreak = 0;
  let currentStreak = 0;
  let tempStreak = 0;
  const today = new Date().toISOString().split("T")[0];

  for (const d of sorted) {
    if (activeDates.has(d)) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
      if (d === today) currentStreak = tempStreak;
    } else {
      if (d === today) currentStreak = 0;
      tempStreak = 0;
    }
  }

  return {
    totalDays: window.length,
    activeDays,
    consistencyPct: window.length > 0 ? (activeDays / window.length) * 100 : 0,
    longestStreak,
    currentStreak,
  };
}

/** Linear regression slope over points (positive = improving). */
export function linearSlope(points: TrendPoint[]): number {
  const n = points.length;
  if (n < 2) return 0;
  const xs = points.map((_, i) => i);
  const ys = points.map((p) => p.value);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumX2 = xs.reduce((a, x) => a + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  return denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
}

/** Detect a drift: declining trend over N consecutive windows. */
export function detectDrift(
  points: TrendPoint[],
  windowSize = 3,
  minDeclinePct = 5
): boolean {
  if (points.length < windowSize * 2) return false;
  const recent = points.slice(-windowSize);
  const prior = points.slice(-(windowSize * 2), -windowSize);
  const recentAvg = recent.reduce((a, p) => a + p.value, 0) / recent.length;
  const priorAvg = prior.reduce((a, p) => a + p.value, 0) / prior.length;
  if (priorAvg === 0) return false;
  return ((priorAvg - recentAvg) / priorAvg) * 100 >= minDeclinePct;
}
