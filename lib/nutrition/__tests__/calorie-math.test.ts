// Tests for BMR, TDEE, and macro calculations

import {
  calculateBMR,
  calculateTDEE,
  calculateMacroTargets,
  calculateHydrationTarget,
} from "@/services/macros";

describe("Calorie Math", () => {
  describe("calculateBMR", () => {
    it("calculates BMR correctly for males (Mifflin-St Jeor)", () => {
      const bmr = calculateBMR(80, 180, 30, "male");
      // (80*10) + (180*6.25) - (30*5) + 5 = 800 + 1125 - 150 + 5 = 1780
      expect(bmr).toBe(1780);
    });

    it("calculates BMR correctly for females", () => {
      const bmr = calculateBMR(65, 165, 28, "female");
      // (65*10) + (165*6.25) - (28*5) - 161 = 650 + 1031.25 - 140 - 161 = 1380
      expect(bmr).toBe(1380);
    });

    it("BMR increases with weight", () => {
      const bmr_lean = calculateBMR(70, 180, 30, "male");
      const bmr_heavy = calculateBMR(90, 180, 30, "male");
      expect(bmr_heavy).toBeGreaterThan(bmr_lean);
    });
  });

  describe("calculateTDEE", () => {
    it("calculates TDEE with sedentary multiplier", () => {
      const bmr = 1800;
      const tdee = calculateTDEE(bmr, "sedentary");
      expect(tdee).toBe(Math.round(bmr * 1.2)); // 2160
    });

    it("calculates TDEE with moderate activity multiplier", () => {
      const bmr = 1800;
      const tdee = calculateTDEE(bmr, "moderate");
      expect(tdee).toBe(Math.round(bmr * 1.55)); // 2790
    });

    it("TDEE increases with activity level", () => {
      const bmr = 1800;
      const sedentary = calculateTDEE(bmr, "sedentary");
      const very_active = calculateTDEE(bmr, "very_active");
      expect(very_active).toBeGreaterThan(sedentary);
    });
  });

  describe("calculateMacroTargets", () => {
    it("calculates macro targets for maintenance", () => {
      const macros = calculateMacroTargets(80, 2400, "maintenance", "moderate");
      expect(macros.protein_g).toBeGreaterThan(0);
      expect(macros.carbs_g).toBeGreaterThan(0);
      expect(macros.fat_g).toBeGreaterThan(0);
      expect(macros.calories).toBeCloseTo(2400, -2); // within ~100 cal
    });

    it("bulking has higher calories than maintenance", () => {
      const maintenance = calculateMacroTargets(80, 2400, "maintenance", "moderate");
      const lean_bulk = calculateMacroTargets(80, 2400, "lean_bulk", "moderate");
      expect(lean_bulk.calories).toBeGreaterThan(maintenance.calories);
    });

    it("cutting has lower calories than maintenance", () => {
      const maintenance = calculateMacroTargets(80, 2400, "maintenance", "moderate");
      const slow_cut = calculateMacroTargets(80, 2400, "slow_cut", "moderate");
      expect(slow_cut.calories).toBeLessThan(maintenance.calories);
    });

    it("cutting has higher protein than bulking", () => {
      const lean_bulk = calculateMacroTargets(80, 2400, "lean_bulk", "moderate");
      const aggressive_cut = calculateMacroTargets(80, 2400, "aggressive_cut", "moderate");
      expect(aggressive_cut.protein_g).toBeGreaterThan(lean_bulk.protein_g);
    });

    it("protein scales with bodyweight", () => {
      const light = calculateMacroTargets(60, 1800, "maintenance", "moderate");
      const heavy = calculateMacroTargets(100, 3000, "maintenance", "moderate");
      expect(heavy.protein_g).toBeGreaterThan(light.protein_g);
    });

    it("high volume training increases carbs", () => {
      const low_volume = calculateMacroTargets(80, 2400, "maintenance", "low");
      const high_volume = calculateMacroTargets(80, 2400, "maintenance", "high");
      expect(high_volume.carbs_g).toBeGreaterThan(low_volume.carbs_g);
    });

    it("ensures minimum fat targets", () => {
      const macros = calculateMacroTargets(80, 2400, "maintenance", "moderate");
      const min_fat_g = 80 * 0.8; // minimum fat g/kg
      expect(macros.fat_g).toBeGreaterThanOrEqual(min_fat_g - 5); // small margin
    });
  });

  describe("calculateHydrationTarget", () => {
    it("calculates hydration target in ml", () => {
      const target = calculateHydrationTarget(80, "moderate");
      // 80 * 35 + 1000 = 3800
      expect(target).toBeGreaterThan(3000);
      expect(target).toBeLessThan(5000);
    });

    it("very active gets bonus hydration", () => {
      const moderate = calculateHydrationTarget(80, "moderate");
      const very_active = calculateHydrationTarget(80, "very_active");
      expect(very_active).toBeGreaterThan(moderate);
    });
  });
});
