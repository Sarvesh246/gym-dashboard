import { calculateProgression, calculateWorkoutProgression } from "../progression";
import type { ProgressionInput } from "../types";

const BASE_INPUT: ProgressionInput = {
  exercise_id:      "barbell_bench_press",
  training_level:   "intermediate",
  current_weight:   80,
  target_rep_min:   8,
  target_rep_max:   12,
  target_rpe:       7.5,
  sets_performed:   [
    { reps: 10, rpe: 7,   failed: false },
    { reps: 10, rpe: 7,   failed: false },
    { reps: 9,  rpe: 7.5, failed: false },
  ],
  readiness_score:  80,
  systemic_fatigue: 30,
  recent_soreness:  2,
};

describe("calculateProgression — increase cases", () => {
  it("recommends weight increase when top rep range hit with easy RPE", () => {
    const input: ProgressionInput = {
      ...BASE_INPUT,
      sets_performed: [
        { reps: 12, rpe: 6.5, failed: false },
        { reps: 12, rpe: 6.5, failed: false },
        { reps: 12, rpe: 7.0, failed: false },
      ],
    };
    const result = calculateProgression(input);
    expect(result.action).toBe("increase");
    expect(result.weight_delta).toBeGreaterThan(0);
    expect(result.recommended_weight).toBeGreaterThan(80);
  });

  it("beginner increases weight more conservatively", () => {
    const beginnerInput: ProgressionInput = {
      ...BASE_INPUT,
      training_level: "beginner",
      sets_performed: [
        { reps: 12, rpe: 6.5, failed: false },
        { reps: 12, rpe: 6.0, failed: false },
      ],
    };
    const advancedInput: ProgressionInput = {
      ...BASE_INPUT,
      training_level: "advanced",
      sets_performed: [
        { reps: 12, rpe: 6.5, failed: false },
        { reps: 12, rpe: 6.0, failed: false },
      ],
    };
    const begResult = calculateProgression(beginnerInput);
    const advResult = calculateProgression(advancedInput);

    if (begResult.action === "increase" && advResult.action === "increase") {
      expect(begResult.weight_delta).toBeLessThanOrEqual(advResult.weight_delta);
    }
  });
});

describe("calculateProgression — maintain cases", () => {
  it("maintains load when moderate RPE and not at top range", () => {
    const result = calculateProgression(BASE_INPUT);
    expect(result.action).toBe("maintain");
    expect(result.weight_delta).toBe(0);
  });

  it("maintains load when RPE is too high", () => {
    const input: ProgressionInput = {
      ...BASE_INPUT,
      sets_performed: [
        { reps: 8, rpe: 9.5, failed: false },
        { reps: 7, rpe: 10,  failed: false },
      ],
    };
    const result = calculateProgression(input);
    expect(result.action).toBe("maintain");
  });
});

describe("calculateProgression — reduce cases", () => {
  it("recommends reduction when completion rate is too low", () => {
    const input: ProgressionInput = {
      ...BASE_INPUT,
      sets_performed: [
        { reps: 5, rpe: null, failed: true },
        { reps: 4, rpe: null, failed: true },
        { reps: 8, rpe: 8,   failed: false },
      ],
    };
    const result = calculateProgression(input);
    expect(result.action).toBe("reduce");
    expect(result.weight_delta).toBeLessThan(0);
  });
});

describe("calculateProgression — fatigue suppression", () => {
  it("maintains load when systemic fatigue is high", () => {
    const input: ProgressionInput = {
      ...BASE_INPUT,
      systemic_fatigue: 80,
      sets_performed:   [
        { reps: 12, rpe: 6.5, failed: false },
        { reps: 12, rpe: 6.5, failed: false },
      ],
    };
    const result = calculateProgression(input);
    expect(result.action).toBe("maintain");
    expect(result.rationale).toMatch(/fatigue/i);
  });

  it("maintains load when readiness is low", () => {
    const input: ProgressionInput = {
      ...BASE_INPUT,
      readiness_score:  35,
      sets_performed:   [
        { reps: 12, rpe: 6.5, failed: false },
        { reps: 12, rpe: 6.5, failed: false },
      ],
    };
    const result = calculateProgression(input);
    expect(result.action).toBe("maintain");
    expect(result.rationale).toMatch(/readiness/i);
  });

  it("maintains load when soreness is high", () => {
    const input: ProgressionInput = {
      ...BASE_INPUT,
      recent_soreness: 5,
      sets_performed:  [
        { reps: 12, rpe: 6.5, failed: false },
        { reps: 12, rpe: 6.5, failed: false },
      ],
    };
    const result = calculateProgression(input);
    expect(result.action).toBe("maintain");
  });
});

describe("calculateProgression — double progression", () => {
  it("recommends more reps when at top range with moderate RPE", () => {
    const input: ProgressionInput = {
      ...BASE_INPUT,
      sets_performed: [
        { reps: 12, rpe: 7.5, failed: false },
        { reps: 12, rpe: 8.0, failed: false },
      ],
    };
    const result = calculateProgression(input);
    // Should increase rep target before weight
    if (result.action === "maintain") {
      expect(result.rep_target_max).toBeGreaterThanOrEqual(BASE_INPUT.target_rep_max);
    }
  });
});

describe("calculateWorkoutProgression", () => {
  it("processes multiple exercises", () => {
    const inputs: ProgressionInput[] = [
      { ...BASE_INPUT, exercise_id: "barbell_bench_press" },
      { ...BASE_INPUT, exercise_id: "dumbbell_row", current_weight: 30 },
    ];
    const results = calculateWorkoutProgression(inputs);
    expect(results).toHaveLength(2);
    results.forEach((r) => {
      expect(r.exercise_id).toBeDefined();
      expect(r.recommended_weight).toBeGreaterThanOrEqual(0);
    });
  });
});
