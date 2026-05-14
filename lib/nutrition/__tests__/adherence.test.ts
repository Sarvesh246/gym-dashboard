// Tests for nutrition adherence scoring

import {
  calculateDailyAdherence,
  calculateWeeklyAdherence,
  calculateRecoveryModifier,
} from "@/services/macros";
import { DailyNutritionSummary, NutritionGoals } from "@/lib/nutrition/types";

describe("Nutrition Adherence", () => {
  const goals: NutritionGoals = {
    id: "test",
    user_id: "user-1",
    calorie_target: 2500,
    protein_target: 160,
    carb_target: 300,
    fat_target: 80,
    fiber_target: 30,
    hydration_target_ml: 3000,
    goal_strategy: "maintenance",
    created_at: "",
    updated_at: "",
  };

  describe("calculateDailyAdherence", () => {
    it("scores 100% adherence when goals are met", () => {
      const summary: DailyNutritionSummary = {
        id: "s1",
        user_id: "user-1",
        date: "2026-05-13",
        calories: 2500,
        protein_g: 160,
        carbs_g: 300,
        fat_g: 80,
        fiber_g: 30,
        hydration_ml: 3000,
        adherence_score: 0,
        created_at: "",
        updated_at: "",
      };

      const adherence = calculateDailyAdherence(summary, goals);
      expect(adherence.calorie_adherence).toBe(100);
      expect(adherence.protein_adherence).toBe(100);
      expect(adherence.overall_score).toBe(100);
    });

    it("scores partial adherence when intake is below goal", () => {
      const summary: DailyNutritionSummary = {
        id: "s1",
        user_id: "user-1",
        date: "2026-05-13",
        calories: 2000,
        protein_g: 120,
        carbs_g: 250,
        fat_g: 60,
        fiber_g: 25,
        hydration_ml: 2500,
        adherence_score: 0,
        created_at: "",
        updated_at: "",
      };

      const adherence = calculateDailyAdherence(summary, goals);
      expect(adherence.calorie_adherence).toBe(80); // 2000/2500 = 80%
      expect(adherence.protein_adherence).toBe(75); // 120/160 = 75%
      expect(adherence.overall_score).toBeLessThan(100);
    });

    it("caps adherence at 100 when exceeding goals", () => {
      const summary: DailyNutritionSummary = {
        id: "s1",
        user_id: "user-1",
        date: "2026-05-13",
        calories: 3000,
        protein_g: 180,
        carbs_g: 350,
        fat_g: 100,
        fiber_g: 35,
        hydration_ml: 4000,
        adherence_score: 0,
        created_at: "",
        updated_at: "",
      };

      const adherence = calculateDailyAdherence(summary, goals);
      expect(adherence.calorie_adherence).toBe(100); // capped
      expect(adherence.protein_adherence).toBe(100); // capped
    });

    it("weights protein and calories heavily", () => {
      const low_adherence: DailyNutritionSummary = {
        id: "s1",
        user_id: "user-1",
        date: "2026-05-13",
        calories: 1500, // 60% adherence
        protein_g: 100, // 62% adherence
        carbs_g: 300, // 100% adherence
        fat_g: 80, // 100% adherence
        fiber_g: 30,
        hydration_ml: 3000,
        adherence_score: 0,
        created_at: "",
        updated_at: "",
      };

      const adherence = calculateDailyAdherence(low_adherence, goals);
      // Low calories and protein should pull overall score down significantly
      expect(adherence.overall_score).toBeLessThan(80);
    });

    it("handles zero-intake day", () => {
      const zero_intake: DailyNutritionSummary = {
        id: "s1",
        user_id: "user-1",
        date: "2026-05-13",
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        fiber_g: 0,
        hydration_ml: 0,
        adherence_score: 0,
        created_at: "",
        updated_at: "",
      };

      const adherence = calculateDailyAdherence(zero_intake, goals);
      expect(adherence.overall_score).toBe(0);
    });
  });

  describe("calculateWeeklyAdherence", () => {
    it("calculates rolling 7-day average", () => {
      const summaries: DailyNutritionSummary[] = Array.from({ length: 7 }, (_, i) => ({
        id: `s${i}`,
        user_id: "user-1",
        date: `2026-05-${6 + i}`,
        calories: 2500,
        protein_g: 160,
        carbs_g: 300,
        fat_g: 80,
        fiber_g: 30,
        hydration_ml: 3000,
        adherence_score: 0,
        created_at: "",
        updated_at: "",
      }));

      const weekly = calculateWeeklyAdherence(summaries, goals);
      expect(weekly.overall_score).toBe(100);
      expect(weekly.consistency).toBeGreaterThan(90); // high consistency
    });

    it("calculates consistency as low variance", () => {
      const summaries: DailyNutritionSummary[] = [
        // 4 perfect days
        ...Array.from({ length: 4 }, (_, i) => ({
          id: `s${i}`,
          user_id: "user-1",
          date: `2026-05-${6 + i}`,
          calories: 2500,
          protein_g: 160,
          carbs_g: 300,
          fat_g: 80,
          fiber_g: 30,
          hydration_ml: 3000,
          adherence_score: 0,
          created_at: "",
          updated_at: "",
        })),
        // 3 off days
        ...Array.from({ length: 3 }, (_, i) => ({
          id: `s${4 + i}`,
          user_id: "user-1",
          date: `2026-05-${10 + i}`,
          calories: 1800,
          protein_g: 100,
          carbs_g: 200,
          fat_g: 60,
          fiber_g: 25,
          hydration_ml: 2500,
          adherence_score: 0,
          created_at: "",
          updated_at: "",
        })),
      ];

      const weekly = calculateWeeklyAdherence(summaries, goals);
      expect(weekly.consistency).toBeLessThan(100); // variance reduces consistency
      expect(weekly.consistency).toBeGreaterThan(0);
    });

    it("handles empty summaries", () => {
      const weekly = calculateWeeklyAdherence([], goals);
      expect(weekly.overall_score).toBe(0);
      expect(weekly.consistency).toBe(0);
    });
  });

  describe("calculateRecoveryModifier", () => {
    it("returns +5 for excellent nutrition (>90% adherence)", () => {
      const modifier = calculateRecoveryModifier({
        protein_adherence: 95,
        calorie_adherence: 95,
        overall_score: 95,
        consistency: 90,
      });
      expect(modifier).toBe(5);
    });

    it("returns 0 for good nutrition (80-90%)", () => {
      const modifier = calculateRecoveryModifier({
        protein_adherence: 85,
        calorie_adherence: 85,
        overall_score: 85,
        consistency: 80,
      });
      expect(modifier).toBe(0);
    });

    it("returns -5 for low protein (<80%)", () => {
      const modifier = calculateRecoveryModifier({
        protein_adherence: 70,
        calorie_adherence: 85,
        overall_score: 75,
        consistency: 70,
      });
      expect(modifier).toBe(-5);
    });

    it("returns -10 for under-eating (<80% calories)", () => {
      const modifier = calculateRecoveryModifier({
        protein_adherence: 85,
        calorie_adherence: 75,
        overall_score: 75,
        consistency: 70,
      });
      expect(modifier).toBe(-10);
    });

    it("returns -3 for over-eating (>130%)", () => {
      const modifier = calculateRecoveryModifier({
        protein_adherence: 100,
        calorie_adherence: 140,
        overall_score: 120,
        consistency: 50,
      });
      expect(modifier).toBe(-3);
    });
  });
});
