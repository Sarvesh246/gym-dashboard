/**
 * Validation utilities for wearable payloads and metrics
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Metric bounds for sanity checking
const METRIC_BOUNDS = {
  sleep_duration: { min: 0, max: 12, unit: "hours" },
  sleep_quality: { min: 0, max: 100, unit: "score" },
  hrv: { min: 0, max: 300, unit: "ms" },
  resting_heart_rate: { min: 30, max: 150, unit: "bpm" },
  stress_score: { min: 0, max: 100, unit: "score" },
  daily_steps: { min: 0, max: 100000, unit: "steps" },
  active_calories: { min: 0, max: 10000, unit: "kcal" },
};

export function validateMetricValue(
  metric: string,
  value: number | null | undefined
): ValidationResult {
  const errors: string[] = [];

  if (value === null || value === undefined) {
    return { valid: true, errors: [] }; // null values are allowed (missing data)
  }

  const bounds = METRIC_BOUNDS[metric as keyof typeof METRIC_BOUNDS];
  if (!bounds) {
    errors.push(`Unknown metric: ${metric}`);
    return { valid: false, errors };
  }

  if (typeof value !== "number" || isNaN(value)) {
    errors.push(`${metric}: expected number, got ${typeof value}`);
  } else if (value < bounds.min) {
    errors.push(`${metric}: value ${value} below minimum ${bounds.min}`);
  } else if (value > bounds.max) {
    errors.push(`${metric}: value ${value} exceeds maximum ${bounds.max}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateTimestamp(timestamp: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof timestamp === "string") {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        errors.push(`Invalid ISO timestamp: ${timestamp}`);
      }
    } catch {
      errors.push(`Failed to parse timestamp: ${timestamp}`);
    }
  } else if (typeof timestamp === "number") {
    if (!Number.isInteger(timestamp) || timestamp < 0) {
      errors.push(`Invalid unix timestamp: ${timestamp}`);
    }
  } else {
    errors.push(`Timestamp must be ISO string or unix timestamp, got ${typeof timestamp}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateMetricsPayload(payload: unknown): ValidationResult {
  const errors: string[] = [];

  if (!payload || typeof payload !== "object") {
    errors.push("Payload must be an object");
    return { valid: false, errors };
  }

  const obj = payload as Record<string, unknown>;

  // Validate each metric if present
  for (const [key, value] of Object.entries(obj)) {
    if (key === "metric_date" || key === "timestamp") continue;

    const result = validateMetricValue(key, value as number | null);
    if (!result.valid) {
      errors.push(...result.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function normalizeTimestamp(
  timestamp: string | number | Date
): {
  iso: string;
  unix: number;
  date: Date;
} {
  let date: Date;

  if (typeof timestamp === "string") {
    date = new Date(timestamp);
  } else if (typeof timestamp === "number") {
    // Could be unix seconds or ms; assume seconds if < 10^11
    const ms = timestamp < 100000000000 ? timestamp * 1000 : timestamp;
    date = new Date(ms);
  } else {
    date = timestamp;
  }

  return {
    iso: date.toISOString(),
    unix: Math.floor(date.getTime() / 1000),
    date,
  };
}
