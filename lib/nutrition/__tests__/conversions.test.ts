// Tests for lib/nutrition/conversions.ts

import {
  normalizeUnit,
  toGrams,
  scaleMacros,
  servingMultiplier,
  formatServing,
  mlToOz,
  mlToCups,
} from "@/lib/nutrition/conversions";

describe("normalizeUnit", () => {
  it("normalizes plural aliases", () => {
    expect(normalizeUnit("grams")).toBe("g");
    expect(normalizeUnit("ounces")).toBe("oz");
    expect(normalizeUnit("cups")).toBe("cup");
    expect(normalizeUnit("tablespoons")).toBe("tbsp");
    expect(normalizeUnit("teaspoons")).toBe("tsp");
    expect(normalizeUnit("milliliters")).toBe("ml");
  });

  it("returns canonical units unchanged", () => {
    expect(normalizeUnit("g")).toBe("g");
    expect(normalizeUnit("oz")).toBe("oz");
    expect(normalizeUnit("ml")).toBe("ml");
  });

  it("is case insensitive", () => {
    expect(normalizeUnit("GRAMS")).toBe("g");
    expect(normalizeUnit("Oz")).toBe("oz");
  });

  it("returns unknown units as-is", () => {
    expect(normalizeUnit("foobar")).toBe("foobar");
  });
});

describe("toGrams", () => {
  it("converts grams to grams (1:1)", () => {
    expect(toGrams(100, "g")).toBe(100);
  });

  it("converts ounces to grams", () => {
    const result = toGrams(1, "oz");
    expect(result).toBeCloseTo(28.35, 1);
  });

  it("converts cup to grams", () => {
    expect(toGrams(1, "cup")).toBe(240);
  });

  it("converts tbsp to grams", () => {
    expect(toGrams(2, "tbsp")).toBe(30);
  });

  it("returns null for unconvertible units", () => {
    expect(toGrams(1, "unit")).toBeNull();
  });

  it("normalizes aliases before conversion", () => {
    expect(toGrams(100, "grams")).toBe(100);
    expect(toGrams(1, "ounce")).toBeCloseTo(28.35, 1);
  });
});

describe("scaleMacros", () => {
  const base = { calories: 200, protein_g: 20, carbs_g: 30, fat_g: 10, fiber_g: 5 };

  it("scales by 1x returns original", () => {
    const result = scaleMacros(base, 1);
    expect(result.calories).toBe(200);
    expect(result.protein_g).toBeCloseTo(20, 1);
  });

  it("scales by 2x doubles all values", () => {
    const result = scaleMacros(base, 2);
    expect(result.calories).toBe(400);
    expect(result.protein_g).toBeCloseTo(40, 1);
    expect(result.fat_g).toBeCloseTo(20, 1);
  });

  it("scales by 0.5 halves all values", () => {
    const result = scaleMacros(base, 0.5);
    expect(result.calories).toBe(100);
    expect(result.carbs_g).toBeCloseTo(15, 1);
  });

  it("handles missing fiber_g gracefully", () => {
    const noFiber = { calories: 200, protein_g: 20, carbs_g: 30, fat_g: 10 };
    const result = scaleMacros(noFiber, 2);
    expect(result.fiber_g).toBe(0);
  });
});

describe("servingMultiplier", () => {
  it("returns 1 for same size, 1 serving", () => {
    expect(servingMultiplier(100, 100, 1)).toBeCloseTo(1);
  });

  it("doubles for 2 servings", () => {
    expect(servingMultiplier(100, 100, 2)).toBeCloseTo(2);
  });

  it("scales proportionally with size change", () => {
    expect(servingMultiplier(100, 50, 1)).toBeCloseTo(0.5);
  });

  it("handles zero original size gracefully", () => {
    expect(servingMultiplier(0, 100, 1)).toBeCloseTo(1);
  });
});

describe("formatServing", () => {
  it("omits decimal for whole numbers", () => {
    expect(formatServing(100)).toBe("100");
    expect(formatServing(1)).toBe("1");
  });

  it("shows one decimal for fractional values", () => {
    expect(formatServing(1.5)).toBe("1.5");
    expect(formatServing(0.5)).toBe("0.5");
  });
});

describe("ml conversions", () => {
  it("converts ml to oz", () => {
    expect(mlToOz(295.735)).toBeCloseTo(10, 0);
  });

  it("converts ml to cups", () => {
    expect(mlToCups(240)).toBeCloseTo(1, 1);
    expect(mlToCups(480)).toBeCloseTo(2, 1);
  });
});
