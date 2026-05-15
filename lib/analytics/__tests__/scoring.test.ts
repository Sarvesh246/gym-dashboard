import {
  scoreConsistency,
  scoreProgressionVelocity,
  scoreRecoveryTrend,
  scoreNutritionAdherence,
  compositeWeeklyScore,
  classifyScoreTier,
  computeDeloadUrgency,
} from "../scoring";
import type { TrendPoint } from "../trends";

function pts(values: number[]): TrendPoint[] {
  return values.map((v, i) => ({ date: `2025-01-${String(i + 1).padStart(2, "0")}`, value: v }));
}

describe("scoreConsistency", () => {
  it("returns 100 when at or above target", () => {
    expect(scoreConsistency(4, 4)).toBe(100);
    expect(scoreConsistency(5, 4)).toBe(100);
  });

  it("returns 75 when 3 of 4 target days hit", () => {
    expect(scoreConsistency(3, 4)).toBe(75);
  });

  it("returns 0 for 0 workouts", () => {
    expect(scoreConsistency(0, 4)).toBe(0);
  });

  it("returns 100 when target is 0", () => {
    expect(scoreConsistency(0, 0)).toBe(100);
  });
});

describe("scoreProgressionVelocity", () => {
  it("returns 50 for single point", () => {
    expect(scoreProgressionVelocity(pts([100]))).toBe(50);
  });

  it("returns > 50 for positive slope", () => {
    const rising = pts([100, 105, 110, 115, 120]);
    expect(scoreProgressionVelocity(rising)).toBeGreaterThan(50);
  });

  it("returns < 50 for negative slope", () => {
    const falling = pts([120, 115, 110, 105, 100]);
    expect(scoreProgressionVelocity(falling)).toBeLessThan(50);
  });

  it("returns 0–100 always", () => {
    const score = scoreProgressionVelocity(pts([1, 1, 1, 1, 1]));
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("scoreRecoveryTrend", () => {
  it("returns 50 for empty", () => {
    expect(scoreRecoveryTrend([])).toBe(50);
  });

  it("reflects rolling average", () => {
    const readiness = pts([70, 75, 80, 85, 80, 75, 70]);
    const score = scoreRecoveryTrend(readiness);
    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("scoreNutritionAdherence", () => {
  it("returns 0 for 0 adherence", () => {
    expect(scoreNutritionAdherence(0)).toBe(0);
  });

  it("returns 100 for perfect adherence", () => {
    expect(scoreNutritionAdherence(1)).toBe(100);
  });

  it("clamps over 1", () => {
    expect(scoreNutritionAdherence(1.5)).toBe(100);
  });
});

describe("compositeWeeklyScore", () => {
  it("returns weighted average", () => {
    const score = compositeWeeklyScore({
      consistencyScore: 80,
      recoveryScore: 60,
      progressionScore: 70,
      nutritionScore: 90,
    });
    const expected = Math.round(80 * 0.3 + 60 * 0.3 + 70 * 0.2 + 90 * 0.2);
    expect(score).toBe(expected);
  });

  it("is 100 when all perfect", () => {
    const score = compositeWeeklyScore({
      consistencyScore: 100,
      recoveryScore: 100,
      progressionScore: 100,
      nutritionScore: 100,
    });
    expect(score).toBe(100);
  });
});

describe("classifyScoreTier", () => {
  it("classifies 85 as excellent", () => {
    expect(classifyScoreTier(85)).toBe("excellent");
  });

  it("classifies 65 as good", () => {
    expect(classifyScoreTier(65)).toBe("good");
  });

  it("classifies 45 as fair", () => {
    expect(classifyScoreTier(45)).toBe("fair");
  });

  it("classifies 30 as poor", () => {
    expect(classifyScoreTier(30)).toBe("poor");
  });
});

describe("computeDeloadUrgency", () => {
  it("returns 0 when all signals good", () => {
    expect(
      computeDeloadUrgency({
        avgReadiness7d: 80,
        avgReadiness14d: 78,
        fatigueAccumulation: 30,
        failedProgressionCount: 0,
      })
    ).toBe(0);
  });

  it("returns high urgency when readiness very low", () => {
    const urgency = computeDeloadUrgency({
      avgReadiness7d: 45,
      avgReadiness14d: 55,
      fatigueAccumulation: 80,
      failedProgressionCount: 3,
    });
    expect(urgency).toBeGreaterThanOrEqual(2);
  });

  it("clamps at 3", () => {
    const urgency = computeDeloadUrgency({
      avgReadiness7d: 40,
      avgReadiness14d: 70,
      fatigueAccumulation: 90,
      failedProgressionCount: 5,
    });
    expect(urgency).toBeLessThanOrEqual(3);
  });
});
