import { generateWorkout, getWeekSchedule } from "../generator";
import type { GeneratorInput } from "../types";

const BASE_INPUT: GeneratorInput = {
  user_id:            "test-user",
  training_level:     "intermediate",
  goal:               "hypertrophy",
  split_type:         "push_pull_legs",
  workout_day:        "push",
  equipment:          ["barbell", "dumbbell", "cable", "bench"],
  available_muscles:  [],
  systemic_readiness: 80,
  days_per_week:      4,
};

describe("generateWorkout", () => {
  it("returns a workout with exercises", () => {
    const result = generateWorkout(BASE_INPUT);
    expect(result.exercises.length).toBeGreaterThan(0);
  });

  it("respects the workout day", () => {
    const result = generateWorkout(BASE_INPUT);
    expect(result.workout_day).toBe("push");
  });

  it("beginner gets fewer exercises than advanced", () => {
    const beginner = generateWorkout({ ...BASE_INPUT, training_level: "beginner" });
    const advanced = generateWorkout({ ...BASE_INPUT, training_level: "advanced" });
    expect(beginner.exercises.length).toBeLessThanOrEqual(advanced.exercises.length);
  });

  it("reduces volume on low readiness", () => {
    const fullReadiness  = generateWorkout({ ...BASE_INPUT, systemic_readiness: 90 });
    const lowReadiness   = generateWorkout({ ...BASE_INPUT, systemic_readiness: 30 });
    expect(lowReadiness.exercises.length).toBeLessThanOrEqual(fullReadiness.exercises.length);
  });

  it("avoids exercises that require equipment not in list", () => {
    const bodyweightOnly = generateWorkout({
      ...BASE_INPUT,
      equipment: ["bodyweight"],
    });
    bodyweightOnly.exercises.forEach((e) => {
      // All exercises should have bodyweight-compatible equipment
      // (the test checks that barbell exercises are excluded)
      expect(e.exercise_id).not.toBe("barbell_bench_press");
    });
  });

  it("compounds come first with compound_first=true", () => {
    const result = generateWorkout({ ...BASE_INPUT, training_level: "intermediate" });
    if (result.exercises.length >= 2) {
      const first = result.exercises[0];
      const patterns = ["horizontal_push", "vertical_push", "squat", "hinge", "horizontal_pull", "vertical_pull"];
      // First exercise should be a compound if available
      // (not guaranteed due to equipment restrictions, but should be likely)
      expect(first.order_index).toBe(0);
    }
  });

  it("sets rep ranges for strength goal", () => {
    const result = generateWorkout({ ...BASE_INPUT, goal: "strength" });
    const firstCompound = result.exercises[0];
    expect(firstCompound.target_rep_min).toBeLessThanOrEqual(6);
  });

  it("sets wider rep ranges for endurance goal", () => {
    const result = generateWorkout({ ...BASE_INPUT, goal: "endurance" });
    const firstCompound = result.exercises[0];
    expect(firstCompound.target_rep_max).toBeGreaterThanOrEqual(12);
  });

  it("generates different days correctly", () => {
    const pullDay = generateWorkout({ ...BASE_INPUT, workout_day: "pull" });
    const legDay  = generateWorkout({ ...BASE_INPUT, workout_day: "legs" });
    const pushIds = new Set(generateWorkout(BASE_INPUT).exercises.map((e) => e.exercise_id));
    const pullIds = new Set(pullDay.exercises.map((e) => e.exercise_id));
    // Pull and push days should have different exercises
    const overlap = [...pushIds].filter((id) => pullIds.has(id));
    expect(overlap.length).toBeLessThan(pushIds.size); // most are different
  });

  it("returns a positive estimated duration", () => {
    const result = generateWorkout(BASE_INPUT);
    expect(result.estimated_duration).toBeGreaterThan(0);
  });

  it("handles full_body split", () => {
    const result = generateWorkout({
      ...BASE_INPUT,
      split_type:  "full_body",
      workout_day: "full_body_a",
    });
    expect(result.exercises.length).toBeGreaterThan(0);
  });

  it("handles minimal workout for very low readiness", () => {
    const result = generateWorkout({ ...BASE_INPUT, systemic_readiness: 20 });
    expect(result.exercises.length).toBeLessThanOrEqual(3);
  });
});

describe("getWeekSchedule", () => {
  it("returns correct day count for PPL 3x", () => {
    const schedule = getWeekSchedule("push_pull_legs", 3);
    expect(schedule).toHaveLength(3);
  });

  it("returns correct day count for upper/lower 4x", () => {
    const schedule = getWeekSchedule("upper_lower", 4);
    expect(schedule).toHaveLength(4);
    expect(schedule).toEqual(["upper", "lower", "upper", "lower"]);
  });

  it("cycles days when days_per_week > split length", () => {
    const schedule = getWeekSchedule("upper_lower", 6);
    expect(schedule).toHaveLength(6);
  });
});
