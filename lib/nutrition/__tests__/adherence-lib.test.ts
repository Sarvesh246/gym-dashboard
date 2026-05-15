// Tests for lib/nutrition/adherence.ts (new standalone lib)

import {
  calculateDailyAdherence,
  calculateWeeklyAdherence,
  scoreCalorieAdherence,
  scoreProteinAdherence,
  scoreHydrationAdherence,
  calculateNutritionRecoveryModifier,
} from "@/lib/nutrition/adherence";
import { DailyNutritionSummary, NutritionGoals } from "@/lib/nutrition/types";

const baseGoals: NutritionGoals = {
  id: "g1",
  user_id: "u1",
  calorie_target: 2500,
  protein_target: 160,
  carb_target: 300,
  fat_target: 80,
  fiber_target: 30,
  hydration_target_ml: 2500,
  goal_strategy: "maintenance",
  created_at: "",
  updated_at: "",
};

const makeSummary = (overrides: Partial<DailyNutritionSummary> = {}): DailyNutritionSummary => ({
  id: "s1",
  user_id: "u1",
  date: "2026-05-14",
  calories: 2500,
  protein_g: 160,
  carbs_g: 300,
  fat_g: 80,
  fiber_g: 30,
  hydration_ml: 2500,
  adherence_score: 100,
  created_at: "",
  updated_at: "",
  ...overrides,
});

describe("scoreCalorieAdherence", () => {
  it("returns 100 when meeting target exactly", () => {
    expect(scoreCalorieAdherence(2500, 2500)).toBe(100);
  });

  it("returns 80 for 80% intake", () => {
    expect(scoreCalorieAdherence(2000, 2500)).toBe(80);
  });

  it("caps at 100 when exceeding", () => {
    expect(scoreCalorieAdherence(3500, 2500)).toBe(100);
  });

  it("returns 0 for zero intake", () => {
    expect(scoreCalorieAdherence(0, 2500)).toBe(0);
  });
});

describe("scoreProteinAdherence", () => {
  it("returns 100 for meeting target", () => {
    expect(scoreProteinAdherence(160, 160)).toBe(100);
  });

  it("rounds correctly", () => {
    expect(scoreProteinAdherence(120, 160)).toBe(75);
  });
});

describe("scoreHydrationAdherence", () => {
  it("returns 100 at or above target", () => {
    expect(scoreHydrationAdherence(2500, 2500)).toBe(100);
  });

  it("caps at 100 for 150% of target", () => {
    expect(scoreHydrationAdherence(3750, 2500)).toBe(100);
  });

  it("returns proportional score below target", () => {
    expect(scoreHydrationAdherence(1250, 2500)).toBe(50);
  });

  it("handles zero target gracefully", () => {
    expect(scoreHydrationAdherence(500, 0)).toBe(100);
  });
});

describe("calculateDailyAdherence", () => {
  it("returns 100 for all goals met", () => {
    const a = calculateDailyAdherence(makeSummary(), baseGoals);
    expect(a.overall_score).toBe(100);
    expect(a.calorie_adherence).toBe(100);
    expect(a.protein_adherence).toBe(100);
  });

  it("returns 0 for zero intake", () => {
    const a = calculateDailyAdherence(
      makeSummary({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }),
      baseGoals
    );
    expect(a.overall_score).toBe(0);
  });

  it("weights protein and calories heavier than carbs/fat", () => {
    const low_protein_calories = calculateDailyAdherence(
      makeSummary({ calories: 1500, protein_g: 100, carbs_g: 300, fat_g: 80 }),
      baseGoals
    );
    const low_carbs_fat = calculateDailyAdherence(
      makeSummary({ calories: 2500, protein_g: 160, carbs_g: 100, fat_g: 20 }),
      baseGoals
    );
    expect(low_protein_calories.overall_score).toBeLessThan(low_carbs_fat.overall_score);
  });
});

describe("calculateWeeklyAdherence", () => {
  it("returns zeros for empty array", () => {
    const w = calculateWeeklyAdherence([], baseGoals);
    expect(w.overall_score).toBe(0);
    expect(w.consistency).toBe(0);
  });

  it("returns 100 and high consistency for perfect week", () => {
    const summaries = Array.from({ length: 7 }, (_, i) =>
      makeSummary({ date: `2026-05-${7 + i}` })
    );
    const w = calculateWeeklyAdherence(summaries, baseGoals);
    expect(w.overall_score).toBe(100);
    expect(w.consistency).toBeGreaterThan(95);
  });

  it("reduces consistency for variable days", () => {
    const good = makeSummary({ date: "2026-05-07" });
    const bad = makeSummary({ date: "2026-05-08", calories: 1000, protein_g: 60, carbs_g: 100, fat_g: 30 });
    const w = calculateWeeklyAdherence([good, bad], baseGoals);
    expect(w.consistency).toBeLessThan(90);
  });
});

describe("calculateNutritionRecoveryModifier", () => {
  it("returns +5 for excellent nutrition", () => {
    expect(calculateNutritionRecoveryModifier({
      protein_adherence: 95,
      calorie_adherence: 95,
      overall_score: 95,
      consistency: 90,
    })).toBe(5);
  });

  it("returns -10 for severe under-eating", () => {
    expect(calculateNutritionRecoveryModifier({
      protein_adherence: 90,
      calorie_adherence: 70,
      overall_score: 75,
      consistency: 70,
    })).toBe(-10);
  });

  it("returns -5 for low protein even with adequate calories", () => {
    expect(calculateNutritionRecoveryModifier({
      protein_adherence: 70,
      calorie_adherence: 90,
      overall_score: 78,
      consistency: 75,
    })).toBe(-5);
  });

  it("returns -3 for significant over-eating", () => {
    expect(calculateNutritionRecoveryModifier({
      protein_adherence: 100,
      calorie_adherence: 135,
      overall_score: 115,
      consistency: 60,
    })).toBe(-3);
  });

  it("returns 0 for adequate but not excellent nutrition", () => {
    expect(calculateNutritionRecoveryModifier({
      protein_adherence: 82,
      calorie_adherence: 85,
      overall_score: 82,
      consistency: 78,
    })).toBe(0);
  });
});
