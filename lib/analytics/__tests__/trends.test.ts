import {
  rollingAverage,
  ewma,
  analyzeTrend,
  isStagnant,
  computeConsistency,
  linearSlope,
  detectDrift,
  type TrendPoint,
} from "../trends";

function pts(values: number[]): TrendPoint[] {
  return values.map((v, i) => ({ date: `2025-01-${String(i + 1).padStart(2, "0")}`, value: v }));
}

describe("rollingAverage", () => {
  it("returns 0 for empty series", () => {
    expect(rollingAverage([], 7)).toBe(0);
  });

  it("averages last N points", () => {
    const p = pts([10, 20, 30, 40, 50]);
    expect(rollingAverage(p, 3)).toBeCloseTo(40);
  });

  it("uses all points if window > length", () => {
    const p = pts([4, 6]);
    expect(rollingAverage(p, 10)).toBeCloseTo(5);
  });
});

describe("ewma", () => {
  it("returns 0 for empty series", () => {
    expect(ewma([], 7)).toBe(0);
  });

  it("returns single value unchanged", () => {
    expect(ewma(pts([42]), 7)).toBeCloseTo(42);
  });

  it("is influenced by recent values (higher than simple average when last value is high)", () => {
    const p = pts([10, 10, 10, 10, 10, 10, 100]);
    const simple = rollingAverage(p, 7);
    const exp = ewma(p, 7);
    expect(exp).toBeGreaterThan(simple);
  });
});

describe("analyzeTrend", () => {
  it("returns flat for empty series", () => {
    const result = analyzeTrend([]);
    expect(result.direction).toBe("flat");
  });

  it("detects upward trend", () => {
    const result = analyzeTrend(pts([10, 10, 10, 10, 20, 20, 20, 20]));
    expect(result.direction).toBe("up");
    expect(result.delta).toBeGreaterThan(0);
  });

  it("detects downward trend", () => {
    const result = analyzeTrend(pts([20, 20, 20, 20, 10, 10, 10, 10]));
    expect(result.direction).toBe("down");
    expect(result.delta).toBeLessThan(0);
  });

  it("detects flat trend when change < 2%", () => {
    const result = analyzeTrend(pts([100, 100, 100, 100, 101, 101, 101, 101]));
    expect(result.direction).toBe("flat");
  });

  it("computes deltaPct correctly", () => {
    const result = analyzeTrend(pts([50, 50, 50, 50, 100, 100, 100, 100]));
    expect(result.deltaPct).toBeCloseTo(100);
  });
});

describe("isStagnant", () => {
  it("returns false for < 3 points", () => {
    expect(isStagnant(pts([10, 10]), 5)).toBe(false);
  });

  it("returns true when all values within threshold", () => {
    expect(isStagnant(pts([100, 101, 99, 100, 101]), 3)).toBe(true);
  });

  it("returns false when values vary beyond threshold", () => {
    expect(isStagnant(pts([100, 110, 90, 105, 95]), 3)).toBe(false);
  });

  it("returns false when mean is 0", () => {
    expect(isStagnant(pts([0, 0, 0, 0]), 3)).toBe(false);
  });
});

describe("computeConsistency", () => {
  it("returns 0% when no active days in window", () => {
    const dates = ["2025-01-01", "2025-01-02", "2025-01-03"];
    const result = computeConsistency(dates, new Set(), 7);
    expect(result.consistencyPct).toBe(0);
    expect(result.activeDays).toBe(0);
  });

  it("returns 100% when all days active", () => {
    const dates = ["2025-01-01", "2025-01-02", "2025-01-03"];
    const result = computeConsistency(dates, new Set(dates), 7);
    expect(result.consistencyPct).toBe(100);
  });

  it("counts active days correctly", () => {
    const dates = ["2025-01-01", "2025-01-02", "2025-01-03", "2025-01-04"];
    const active = new Set(["2025-01-01", "2025-01-03"]);
    const result = computeConsistency(dates, active, 7);
    expect(result.activeDays).toBe(2);
    expect(result.consistencyPct).toBe(50);
  });

  it("computes longest streak", () => {
    const dates = ["2025-01-01", "2025-01-02", "2025-01-03", "2025-01-04", "2025-01-05"];
    const active = new Set(["2025-01-01", "2025-01-02", "2025-01-03", "2025-01-05"]);
    const result = computeConsistency(dates, active, 7);
    expect(result.longestStreak).toBe(3);
  });
});

describe("linearSlope", () => {
  it("returns 0 for single point", () => {
    expect(linearSlope(pts([10]))).toBe(0);
  });

  it("returns positive slope for ascending series", () => {
    expect(linearSlope(pts([1, 2, 3, 4, 5]))).toBeGreaterThan(0);
  });

  it("returns negative slope for descending series", () => {
    expect(linearSlope(pts([5, 4, 3, 2, 1]))).toBeLessThan(0);
  });

  it("returns ~0 slope for flat series", () => {
    expect(Math.abs(linearSlope(pts([10, 10, 10, 10, 10])))).toBeCloseTo(0, 5);
  });
});

describe("detectDrift", () => {
  it("returns false when not enough data", () => {
    expect(detectDrift(pts([10, 20]), 3, 5)).toBe(false);
  });

  it("detects significant decline", () => {
    const declining = pts([80, 80, 80, 50, 50, 50]);
    expect(detectDrift(declining, 3, 5)).toBe(true);
  });

  it("does not flag stable series", () => {
    const stable = pts([80, 82, 79, 81, 80, 81]);
    expect(detectDrift(stable, 3, 5)).toBe(false);
  });
});
