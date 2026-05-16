// Display formatting utilities for reports and analytics.

/** Format a percentage delta with sign. */
export function formatDeltaPct(deltaPct: number): string {
  const sign = deltaPct >= 0 ? "+" : "";
  return `${sign}${deltaPct.toFixed(1)}%`;
}

/** Format a 0–100 score with a tier label. */
export function formatScore(score: number): { value: string; tier: "excellent" | "good" | "fair" | "poor" } {
  const tier =
    score >= 80 ? "excellent" : score >= 60 ? "good" : score >= 40 ? "fair" : "poor";
  return { value: `${Math.round(score)}`, tier };
}

/** Format kg to lbs string with sign. */
export function formatWeightChange(deltaKg: number): string {
  const lbs = deltaKg * 2.205;
  const sign = lbs >= 0 ? "+" : "";
  return `${sign}${lbs.toFixed(1)} lbs`;
}

/** Format a decimal as a percentage string. */
export function formatPct(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/** Format hours as "Xh Ym". */
export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Format a date string (YYYY-MM-DD) to a human-readable month+day string. */
export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Format YYYY-MM to "Month YYYY". */
export function formatMonth(ym: string): string {
  const [year, month] = ym.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Format a year number to string. */
export function formatYear(year: number): string {
  return `${year}`;
}

/** Abbreviate month name from YYYY-MM-DD. */
export function shortMonth(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short" });
}

/** Abbreviate date to "Jan 5" style. */
export function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Format a direction arrow. */
export function directionArrow(direction: "up" | "down" | "flat"): string {
  return direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
}

/** Plural helper. */
export function plural(n: number, singular: string, pluralForm?: string): string {
  return `${n} ${n === 1 ? singular : (pluralForm ?? singular + "s")}`;
}
