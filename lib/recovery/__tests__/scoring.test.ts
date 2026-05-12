/**
 * Unit tests for the recovery scoring engine.
 * Run with: npx jest lib/recovery/__tests__/scoring.test.ts
 * (or configure vitest — tests are compatible with both runners)
 */

import {
  clamp,
  classifyRecoveryTier,
  calculateRecoveryDecay,
  calculateMuscleRecovery,
  calculateSystemicFatigue,
  calculateReadiness,
  calculateWorkoutStrain,
  calculateHypertrophyLoad,
} from "../scoring";

// ─── Primitives ───────────────────────────────────────────────────────────────

describe("clamp", () => {
  it("returns value within range unchanged", () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });
  it("clamps below minimum", () => {
    expect(clamp(-10, 0, 100)).toBe(0);
  });
  it("clamps above maximum", () => {
    expect(clamp(110, 0, 100)).toBe(100);
  });
});

// ─── Tier classification ──────────────────────────────────────────────────────

describe("classifyRecoveryTier", () => {
  it("returns green at 85+", () => {
    expect(classifyRecoveryTier(100)).toBe("green");
    expect(classifyRecoveryTier(85)).toBe("green");
  });
  it("returns yellow 65–84", () => {
    expect(classifyRecoveryTier(75)).toBe("yellow");
    expect(classifyRecoveryTier(65)).toBe("yellow");
  });
  it("returns orange 40–64", () => {
    expect(classifyRecoveryTier(52)).toBe("orange");
    expect(classifyRecoveryTier(40)).toBe("orange");
  });
  it("returns red below 40", () => {
    expect(classifyRecoveryTier(39)).toBe("red");
    expect(classifyRecoveryTier(0)).toBe("red");
  });
});

// ─── Recovery decay ───────────────────────────────────────────────────────────

describe("calculateRecoveryDecay", () => {
  it("returns (100 - strain) immediately post-workout", () => {
    const result = calculateRecoveryDecay(80, 0, "moderate");
    expect(result).toBeCloseTo(20, 0);
  });

  it("approaches 100 as time increases", () => {
    const result = calculateRecoveryDecay(80, 200, "moderate");
    expect(result).toBeGreaterThan(90);
  });

  it("recovers faster with fast decay key", () => {
    const fast     = calculateRecoveryDecay(50, 24, "fast");
    const verySlow = calculateRecoveryDecay(50, 24, "very_slow");
    expect(fast).toBeGreaterThan(verySlow);
  });

  it("clamps output to 0–100", () => {
    expect(calculateRecoveryDecay(0, 0, "fast")).toBe(100);
    expect(calculateRecoveryDecay(100, 0, "fast")).toBe(0);
  });
});

// ─── Muscle recovery ─────────────────────────────────────────────────────────

describe("calculateMuscleRecovery", () => {
  const base = {
    muscle_group: "chest" as const,
    weekly_frequency: 2,
    sleep_quality_score: 65,
    systemic_fatigue: 30,
    training_level: "intermediate" as const,
  };

  it("returns 100 when muscle has not been trained", () => {
    const result = calculateMuscleRecovery({
      ...base,
      hours_since_trained: 0,
      last_strain_score: 0,
    });
    expect(result).toBe(100);
  });

  it("returns low score immediately after heavy training", () => {
    const result = calculateMuscleRecovery({
      ...base,
      hours_since_trained: 1,
      last_strain_score: 90,
    });
    expect(result).toBeLessThan(30);
  });

  it("returns higher score after 48h of recovery", () => {
    const result = calculateMuscleRecovery({
      ...base,
      hours_since_trained: 48,
      last_strain_score: 60,
    });
    expect(result).toBeGreaterThan(50);
  });

  // ── EDGE CASE: Beginner soreness ──────────────────────────────────────────
  it("beginners recover better than advanced lifters at same strain", () => {
    const beginner = calculateMuscleRecovery({
      ...base,
      hours_since_trained: 24,
      last_strain_score: 50,
      training_level: "beginner",
    });
    const advanced = calculateMuscleRecovery({
      ...base,
      hours_since_trained: 24,
      last_strain_score: 50,
      training_level: "advanced",
    });
    expect(beginner).toBeGreaterThan(advanced);
  });

  // ── EDGE CASE: Good sleep + high soreness → moderate recovery ─────────────
  it("good sleep improves recovery score vs poor sleep", () => {
    const goodSleep = calculateMuscleRecovery({
      ...base,
      hours_since_trained: 24,
      last_strain_score: 70,
      sleep_quality_score: 90,
    });
    const poorSleep = calculateMuscleRecovery({
      ...base,
      hours_since_trained: 24,
      last_strain_score: 70,
      sleep_quality_score: 20,
    });
    expect(goodSleep).toBeGreaterThan(poorSleep);
  });

  // ── EDGE CASE: High systemic fatigue suppresses local recovery ────────────
  it("high systemic fatigue suppresses local recovery", () => {
    const highSystemic = calculateMuscleRecovery({
      ...base,
      hours_since_trained: 36,
      last_strain_score: 50,
      systemic_fatigue: 90,
    });
    const lowSystemic = calculateMuscleRecovery({
      ...base,
      hours_since_trained: 36,
      last_strain_score: 50,
      systemic_fatigue: 10,
    });
    expect(lowSystemic).toBeGreaterThan(highSystemic);
  });

  // ── EDGE CASE: High weekly frequency penalty ──────────────────────────────
  it("over-frequency (5x/week) reduces recovery score", () => {
    const lowFreq = calculateMuscleRecovery({
      ...base,
      hours_since_trained: 24,
      last_strain_score: 40,
      weekly_frequency: 1,
    });
    const highFreq = calculateMuscleRecovery({
      ...base,
      hours_since_trained: 24,
      last_strain_score: 40,
      weekly_frequency: 5,
    });
    expect(lowFreq).toBeGreaterThan(highFreq);
  });
});

// ─── Systemic fatigue ─────────────────────────────────────────────────────────

describe("calculateSystemicFatigue", () => {
  it("returns low fatigue for easy training week", () => {
    const result = calculateSystemicFatigue({
      weekly_total_sets:         20,
      cns_load_7days:            3,
      consecutive_training_days: 1,
      sleep_hours_avg:           8,
    });
    expect(result).toBeLessThan(40);
  });

  it("returns high fatigue for overreaching week", () => {
    const result = calculateSystemicFatigue({
      weekly_total_sets:         90,
      cns_load_7days:            18,
      consecutive_training_days: 6,
      sleep_hours_avg:           5,
    });
    expect(result).toBeGreaterThan(70);
  });

  // ── EDGE CASE: Poor sleep alone can raise systemic fatigue ────────────────
  it("poor sleep elevates systemic fatigue even with low volume", () => {
    const withBadSleep = calculateSystemicFatigue({
      weekly_total_sets:         15,
      cns_load_7days:            2,
      consecutive_training_days: 1,
      sleep_hours_avg:           4,
    });
    const withGoodSleep = calculateSystemicFatigue({
      weekly_total_sets:         15,
      cns_load_7days:            2,
      consecutive_training_days: 1,
      sleep_hours_avg:           8.5,
    });
    expect(withBadSleep).toBeGreaterThan(withGoodSleep);
  });

  it("clamps output to 0–100", () => {
    const result = calculateSystemicFatigue({
      weekly_total_sets:         200,
      cns_load_7days:            50,
      consecutive_training_days: 14,
      sleep_hours_avg:           3,
    });
    expect(result).toBeLessThanOrEqual(100);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

// ─── Readiness ────────────────────────────────────────────────────────────────

describe("calculateReadiness", () => {
  const goodInput = {
    systemic_fatigue:          20,
    sleep_quality_score:       85,
    stress_score:              30,
    hrv_score:                 72,
    strain_accumulation:       80,
    avg_muscle_recovery:       88,
    consecutive_training_days: 1,
  };

  it("returns high readiness for recovered athlete", () => {
    const result = calculateReadiness(goodInput);
    expect(result.readiness_score).toBeGreaterThan(75);
    expect(["green", "yellow"]).toContain(result.tier);
  });

  // ── EDGE CASE: Low soreness + terrible sleep = low readiness ─────────────
  it("poor sleep overrides low muscle soreness", () => {
    const result = calculateReadiness({
      ...goodInput,
      sleep_quality_score:  15,
      systemic_fatigue:     25,
      avg_muscle_recovery:  90,
    });
    expect(result.readiness_score).toBeLessThan(70);
  });

  // ── EDGE CASE: High systemic fatigue dominates readiness ─────────────────
  it("high systemic fatigue suppresses readiness even with good muscles", () => {
    const result = calculateReadiness({
      ...goodInput,
      systemic_fatigue:     85,
      avg_muscle_recovery:  95,
    });
    expect(result.readiness_score).toBeLessThan(55);
    expect(["orange", "red"]).toContain(result.tier);
  });

  // ── EDGE CASE: Consecutive training days penalty ──────────────────────────
  it("5 consecutive training days reduces readiness", () => {
    const fresh = calculateReadiness({ ...goodInput, consecutive_training_days: 0 });
    const fatigued = calculateReadiness({ ...goodInput, consecutive_training_days: 5 });
    expect(fresh.readiness_score).toBeGreaterThan(fatigued.readiness_score);
  });

  it("returns recommendations array", () => {
    const result = calculateReadiness(goodInput);
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("returns a valid training_recommendation", () => {
    const result = calculateReadiness(goodInput);
    const valid = ["full_intensity", "moderate_intensity", "reduced_volume", "active_recovery", "rest"];
    expect(valid).toContain(result.training_recommendation);
  });
});

// ─── Workout strain ───────────────────────────────────────────────────────────

describe("calculateWorkoutStrain", () => {
  const benchSet = {
    exercise_id: "barbell_bench_press",
    sets:        4,
    reps:        8,
    weight_kg:   80,
    rpe:         8,
  };

  it("returns non-zero strain for a valid workout", () => {
    const result = calculateWorkoutStrain({
      sets:            [benchSet],
      training_level:  "intermediate",
      duration_minutes: 45,
    });
    expect(result.estimated_strain).toBeGreaterThan(0);
    expect(result.cns_load).toBeGreaterThan(0);
    expect(result.systemic_load).toBeGreaterThan(0);
  });

  it("assigns load to chest (primary) and front_delts/triceps (secondary)", () => {
    const result = calculateWorkoutStrain({
      sets:            [benchSet],
      training_level:  "intermediate",
      duration_minutes: 45,
    });
    expect(result.local_muscle_loads.chest).toBeGreaterThan(0);
    expect(result.local_muscle_loads.front_delts).toBeGreaterThan(0);
    expect(result.local_muscle_loads.triceps).toBeGreaterThan(0);
  });

  it("chest load > front_delts load (primary > secondary)", () => {
    const result = calculateWorkoutStrain({
      sets:            [benchSet],
      training_level:  "intermediate",
      duration_minutes: 45,
    });
    expect(result.local_muscle_loads.chest!).toBeGreaterThan(
      result.local_muscle_loads.front_delts!
    );
  });

  it("deadlift produces higher CNS load than bench press", () => {
    const deadliftResult = calculateWorkoutStrain({
      sets:            [{ exercise_id: "conventional_deadlift", sets: 3, reps: 5, weight_kg: 100, rpe: 8 }],
      training_level:  "intermediate",
      duration_minutes: 30,
    });
    const benchResult = calculateWorkoutStrain({
      sets:            [benchSet],
      training_level:  "intermediate",
      duration_minutes: 30,
    });
    expect(deadliftResult.cns_load).toBeGreaterThan(benchResult.cns_load);
  });

  it("clamps all output scores to 0–100", () => {
    const massiveWorkout = {
      sets: Array(20).fill({ exercise_id: "barbell_back_squat", sets: 10, reps: 20, weight_kg: 200, rpe: 10 }),
      training_level: "advanced" as const,
      duration_minutes: 300,
    };
    const result = calculateWorkoutStrain(massiveWorkout);
    expect(result.estimated_strain).toBeLessThanOrEqual(100);
    expect(result.systemic_load).toBeLessThanOrEqual(100);
    expect(result.cns_load).toBeLessThanOrEqual(100);
  });

  it("returns empty muscle loads for empty sets array", () => {
    const result = calculateWorkoutStrain({
      sets: [],
      training_level: "beginner",
      duration_minutes: 0,
    });
    expect(result.estimated_strain).toBe(0);
    expect(Object.keys(result.local_muscle_loads).length).toBe(0);
  });
});

// ─── Hypertrophy load ─────────────────────────────────────────────────────────

describe("calculateHypertrophyLoad", () => {
  it("returns higher load for more sets/reps/weight", () => {
    const high = calculateHypertrophyLoad(4, 10, 100, 0.85);
    const low  = calculateHypertrophyLoad(2, 6,  60, 0.85);
    expect(high).toBeGreaterThan(low);
  });

  it("applies rep-range multiplier penalty outside 5–30 range", () => {
    const inRange  = calculateHypertrophyLoad(3, 12, 80, 0.85);
    const outRange = calculateHypertrophyLoad(3, 2,  80, 0.85);
    expect(inRange).toBeGreaterThan(outRange);
  });
});
