import {
  estimatedOneRepMax,
  setVolume,
  calculateSessionVolume,
  bestEstimated1RM,
  bestWeight,
  buildSessionMetrics,
} from "../volume";
import type { LoggedSet } from "../types";

function makeSet(overrides: Partial<LoggedSet> = {}): LoggedSet {
  return {
    id:               "set-1",
    logged_workout_id: "lw-1",
    exercise_id:      "barbell_bench_press",
    set_number:       1,
    reps:             10,
    weight:           80,
    rpe:              7.5,
    completed:        true,
    failed:           false,
    created_at:       new Date().toISOString(),
    ...overrides,
  };
}

describe("estimatedOneRepMax", () => {
  it("returns 0 for invalid inputs", () => {
    expect(estimatedOneRepMax(0, 10)).toBe(0);
    expect(estimatedOneRepMax(100, 0)).toBe(0);
  });

  it("returns weight for 1 rep", () => {
    expect(estimatedOneRepMax(100, 1)).toBe(100);
  });

  it("calculates Epley formula correctly", () => {
    // 100kg × (1 + 10/30) = 100 × 1.333... ≈ 133.33
    const result = estimatedOneRepMax(100, 10);
    expect(result).toBeCloseTo(133.33, 1);
  });

  it("higher reps = higher estimated 1RM", () => {
    expect(estimatedOneRepMax(80, 12)).toBeGreaterThan(estimatedOneRepMax(80, 8));
  });
});

describe("setVolume", () => {
  it("multiplies weight by reps", () => {
    expect(setVolume(80, 10)).toBe(800);
  });
});

describe("calculateSessionVolume", () => {
  it("sums volume across completed sets", () => {
    const sets = [
      makeSet({ weight: 80, reps: 10 }),
      makeSet({ weight: 80, reps: 8, set_number: 2, id: "s2" }),
    ];
    expect(calculateSessionVolume(sets)).toBe(80 * 10 + 80 * 8);
  });

  it("excludes failed sets", () => {
    const sets = [
      makeSet({ weight: 80, reps: 10 }),
      makeSet({ weight: 80, reps: 5, failed: true, id: "s2", set_number: 2 }),
    ];
    expect(calculateSessionVolume(sets)).toBe(80 * 10);
  });

  it("excludes incomplete sets", () => {
    const sets = [
      makeSet({ weight: 80, reps: 10 }),
      makeSet({ completed: false, id: "s2", set_number: 2 }),
    ];
    expect(calculateSessionVolume(sets)).toBe(800);
  });

  it("returns 0 for empty array", () => {
    expect(calculateSessionVolume([])).toBe(0);
  });
});

describe("bestEstimated1RM", () => {
  it("finds best 1RM across sets", () => {
    const sets = [
      makeSet({ weight: 80, reps: 10 }),
      makeSet({ weight: 100, reps: 3, id: "s2", set_number: 2 }),
    ];
    // 100 × (1 + 3/30) = 110
    const result = bestEstimated1RM(sets);
    expect(result).toBeCloseTo(110, 0);
  });
});

describe("bestWeight", () => {
  it("returns highest weight from completed non-failed sets", () => {
    const sets = [
      makeSet({ weight: 80 }),
      makeSet({ weight: 100, id: "s2", set_number: 2 }),
      makeSet({ weight: 120, failed: true, id: "s3", set_number: 3 }),
    ];
    expect(bestWeight(sets)).toBe(100);
  });
});

describe("buildSessionMetrics", () => {
  it("calculates duration from timestamps", () => {
    const start = new Date();
    const end   = new Date(start.getTime() + 45 * 60_000);
    const sets  = [makeSet()];

    const metrics = buildSessionMetrics(sets, start.toISOString(), end.toISOString());
    expect(metrics.estimated_duration_minutes).toBe(45);
  });

  it("includes muscles trained", () => {
    const sets = [makeSet({ exercise_id: "barbell_bench_press" })];
    const now  = new Date().toISOString();
    const metrics = buildSessionMetrics(sets, now, new Date(Date.now() + 3600_000).toISOString());
    expect(metrics.muscles_trained).toContain("chest");
  });
});
