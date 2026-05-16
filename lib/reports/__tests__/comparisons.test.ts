import {
  compareMetrics,
  formatDeltaPct,
  formatDelta,
  extractChangeHighlights,
  describeChange,
  rollingConsistency,
  longestStreak,
} from "../comparisons";

describe("compareMetrics", () => {
  it("detects upward change", () => {
    const r = compareMetrics(110, 100);
    expect(r.direction).toBe("up");
    expect(r.deltaPct).toBeCloseTo(10, 1);
    expect(r.isSignificant).toBe(true);
  });

  it("detects downward change", () => {
    const r = compareMetrics(80, 100);
    expect(r.direction).toBe("down");
    expect(r.deltaPct).toBeCloseTo(-20, 1);
    expect(r.isSignificant).toBe(true);
  });

  it("detects flat change (< 2%)", () => {
    const r = compareMetrics(101, 100);
    expect(r.direction).toBe("flat");
    expect(r.isSignificant).toBe(false);
  });

  it("handles zero previous value", () => {
    const r = compareMetrics(50, 0);
    expect(r.deltaPct).toBe(0);
    expect(r.direction).toBe("flat");
  });

  it("uses custom significance threshold", () => {
    const r = compareMetrics(105, 100, 10);
    expect(r.isSignificant).toBe(false); // 5% < 10% threshold
  });

  it("computes delta correctly", () => {
    const r = compareMetrics(75, 50);
    expect(r.delta).toBe(25);
    expect(r.current).toBe(75);
    expect(r.previous).toBe(50);
  });
});

describe("formatDeltaPct", () => {
  it("formats positive with + sign", () => {
    expect(formatDeltaPct(10.5)).toBe("+10.5%");
  });

  it("formats negative with - sign", () => {
    expect(formatDeltaPct(-5.2)).toBe("-5.2%");
  });

  it("formats zero as +0.0%", () => {
    expect(formatDeltaPct(0)).toBe("+0.0%");
  });
});

describe("formatDelta", () => {
  it("formats positive delta with unit", () => {
    expect(formatDelta(5, "lbs")).toBe("+5.0 lbs");
  });

  it("formats negative delta", () => {
    expect(formatDelta(-3.5)).toBe("-3.5");
  });
});

describe("extractChangeHighlights", () => {
  const comparisons = [
    {
      label: "Workouts",
      comparison: compareMetrics(20, 15),
      higherIsBetter: true,
      unit: "sessions",
    },
    {
      label: "Recovery",
      comparison: compareMetrics(60, 75),
      higherIsBetter: true,
      unit: "/100",
    },
    {
      label: "Sleep",
      comparison: compareMetrics(7.5, 6.5),
      higherIsBetter: true,
      unit: "hrs",
    },
  ];

  it("separates positives and regressions", () => {
    const { positives, regressions } = extractChangeHighlights(comparisons);
    expect(positives.every((h) => h.isPositive)).toBe(true);
    expect(regressions.every((h) => !h.isPositive)).toBe(true);
  });

  it("excludes non-significant changes", () => {
    const flatComparisons = [
      { label: "X", comparison: compareMetrics(101, 100), higherIsBetter: true },
    ];
    const { positives, regressions } = extractChangeHighlights(flatComparisons);
    expect(positives).toHaveLength(0);
    expect(regressions).toHaveLength(0);
  });

  it("sorts by magnitude descending", () => {
    const { positives } = extractChangeHighlights(comparisons);
    for (let i = 1; i < positives.length; i++) {
      expect(Math.abs(positives[i - 1].deltaPct)).toBeGreaterThanOrEqual(
        Math.abs(positives[i].deltaPct)
      );
    }
  });

  it("respects topN limit", () => {
    const { positives } = extractChangeHighlights(comparisons, 1);
    expect(positives.length).toBeLessThanOrEqual(1);
  });
});

describe("describeChange", () => {
  it("produces human-readable string for increase", () => {
    const h = {
      label: "Workouts",
      current: 20,
      previous: 15,
      deltaPct: 33.3,
      direction: "up" as const,
      isPositive: true,
      unit: "sessions",
    };
    const text = describeChange(h);
    expect(text).toContain("increased");
    expect(text).toContain("Workouts");
    expect(text).toContain("sessions");
  });

  it("produces human-readable string for decrease", () => {
    const h = {
      label: "Recovery",
      current: 60,
      previous: 75,
      deltaPct: -20,
      direction: "down" as const,
      isPositive: false,
      unit: "/100",
    };
    const text = describeChange(h);
    expect(text).toContain("decreased");
    expect(text).toContain("Recovery");
  });
});

describe("rollingConsistency", () => {
  it("returns 100% for all-active", () => {
    const flags = Array(30).fill(true);
    expect(rollingConsistency(flags, 30)).toBe(100);
  });

  it("returns 0% for all-inactive", () => {
    const flags = Array(30).fill(false);
    expect(rollingConsistency(flags, 30)).toBe(0);
  });

  it("computes 50% correctly", () => {
    const flags = Array(20).fill(false).concat(Array(10).fill(true));
    expect(rollingConsistency(flags, 20)).toBe(50);
  });

  it("handles empty array", () => {
    expect(rollingConsistency([], 30)).toBe(0);
  });

  it("uses only last N days", () => {
    const flags = [true, false, false, false, true, true, true, true, true, true];
    // Last 7: false, true, true, true, true, true, true → 6/7 ≈ 85
    expect(rollingConsistency(flags, 7)).toBe(Math.round((6 / 7) * 100));
  });
});

describe("longestStreak", () => {
  it("detects longest streak of trues", () => {
    const flags = [true, true, false, true, true, true, false, true];
    expect(longestStreak(flags)).toBe(3);
  });

  it("returns 0 for all-false", () => {
    expect(longestStreak([false, false, false])).toBe(0);
  });

  it("handles all-true", () => {
    expect(longestStreak([true, true, true, true])).toBe(4);
  });

  it("handles empty array", () => {
    expect(longestStreak([])).toBe(0);
  });
});
