// Pure comparison math for period-over-period analytics.

export interface ComparisonResult {
  current: number;
  previous: number;
  delta: number;
  deltaPct: number;
  direction: "up" | "down" | "flat";
  isSignificant: boolean;
}

export interface ChangeHighlight {
  label: string;
  current: number;
  previous: number;
  deltaPct: number;
  direction: "up" | "down" | "flat";
  isPositive: boolean;
  unit?: string;
}

const FLAT_THRESHOLD_PCT = 2;
const SIGNIFICANT_THRESHOLD_PCT = 5;

export function compareMetrics(
  current: number,
  previous: number,
  significanceThresholdPct = SIGNIFICANT_THRESHOLD_PCT
): ComparisonResult {
  const delta = current - previous;
  const deltaPct = previous !== 0 ? (delta / Math.abs(previous)) * 100 : 0;
  const direction: "up" | "down" | "flat" =
    Math.abs(deltaPct) < FLAT_THRESHOLD_PCT ? "flat" : delta > 0 ? "up" : "down";
  return {
    current,
    previous,
    delta,
    deltaPct,
    direction,
    isSignificant: Math.abs(deltaPct) >= significanceThresholdPct,
  };
}

export function formatDeltaPct(deltaPct: number): string {
  const sign = deltaPct >= 0 ? "+" : "";
  return `${sign}${deltaPct.toFixed(1)}%`;
}

export function formatDelta(delta: number, unit = ""): string {
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}${unit ? ` ${unit}` : ""}`;
}

/**
 * Identify biggest positive and negative changes from a set of metric comparisons.
 * higherIsBetter controls whether an "up" direction is positive.
 */
export function extractChangeHighlights(
  comparisons: Array<{ label: string; comparison: ComparisonResult; higherIsBetter: boolean; unit?: string }>,
  topN = 3
): { positives: ChangeHighlight[]; regressions: ChangeHighlight[] } {
  const positives: ChangeHighlight[] = [];
  const regressions: ChangeHighlight[] = [];

  for (const { label, comparison, higherIsBetter, unit } of comparisons) {
    if (!comparison.isSignificant) continue;
    const isPositive = higherIsBetter
      ? comparison.direction === "up"
      : comparison.direction === "down";

    const highlight: ChangeHighlight = {
      label,
      current: comparison.current,
      previous: comparison.previous,
      deltaPct: comparison.deltaPct,
      direction: comparison.direction,
      isPositive,
      unit,
    };

    if (isPositive) positives.push(highlight);
    else if (comparison.direction !== "flat") regressions.push(highlight);
  }

  const byMagnitude = (a: ChangeHighlight, b: ChangeHighlight) =>
    Math.abs(b.deltaPct) - Math.abs(a.deltaPct);

  return {
    positives: positives.sort(byMagnitude).slice(0, topN),
    regressions: regressions.sort(byMagnitude).slice(0, topN),
  };
}

/** Describe a change highlight as a human-readable string. */
export function describeChange(h: ChangeHighlight): string {
  const sign = h.deltaPct >= 0 ? "+" : "";
  const pct = `${sign}${h.deltaPct.toFixed(0)}%`;
  const unit = h.unit ? ` ${h.unit}` : "";
  return `${h.label} ${h.direction === "up" ? "increased" : "decreased"} ${pct} (${h.previous.toFixed(1)}${unit} → ${h.current.toFixed(1)}${unit}).`;
}

/** Compute a rolling consistency score from an array of boolean activity flags. */
export function rollingConsistency(flags: boolean[], windowDays = 30): number {
  if (flags.length === 0) return 0;
  const window = flags.slice(-windowDays);
  const active = window.filter(Boolean).length;
  return Math.round((active / window.length) * 100);
}

/** Detect a longest streak in an array of boolean activity flags. */
export function longestStreak(flags: boolean[]): number {
  let best = 0;
  let current = 0;
  for (const f of flags) {
    current = f ? current + 1 : 0;
    if (current > best) best = current;
  }
  return best;
}
