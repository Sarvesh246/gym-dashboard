"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, Dumbbell, ChevronDown, ChevronUp } from "lucide-react";
import { ExerciseCard } from "./ExerciseCard";
import { RestTimer } from "./RestTimer";
import { PostWorkoutModal } from "./PostWorkoutModal";
import type { WorkoutWithExercises, ActiveExerciseState, ActiveSetEntry } from "@/lib/training/types";

interface Props {
  workout: WorkoutWithExercises;
  isNew: boolean;
  readinessScore: number;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function WorkoutSession({ workout, isNew, readinessScore }: Props) {
  const router = useRouter();

  // Build initial exercise state
  const [exercises, setExercises] = useState<ActiveExerciseState[]>(() =>
    workout.exercises.map((e) => ({
      exercise_id:     e.exercise_id,
      exercise_name:   e.exercise_name,
      target_sets:     e.target_sets,
      target_rep_min:  e.target_rep_min,
      target_rep_max:  e.target_rep_max,
      target_rpe:      e.target_rpe,
      rest_seconds:    e.rest_seconds,
      sets:            Array.from({ length: e.target_sets }, (_, i) => ({
        set_number: i + 1,
        reps:       null,
        weight:     null,
        rpe:        null,
        completed:  false,
        failed:     false,
      })),
      isExpanded:      true,
      lastPerformance: e.performance ?? null,
    }))
  );

  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [currentSetIdx, setCurrentSetIdx] = useState(0);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restDuration, setRestDuration] = useState(90);
  const [showPostWorkout, setShowPostWorkout] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loggedWorkoutId, setLoggedWorkoutId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionStartedAt] = useState(() => new Date().toISOString());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start session on mount
  useEffect(() => {
    fetch("/api/workouts/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workout_id: workout.id }),
    })
      .then((r) => r.json())
      .then((data) => setLoggedWorkoutId(data.logged_workout_id ?? null))
      .catch(() => {});

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [workout.id]);

  // Auto-save a set to the backend
  const persistSet = useCallback(
    async (exerciseId: string, setNumber: number, entry: ActiveSetEntry) => {
      if (!loggedWorkoutId) return;
      try {
        await fetch(`/api/workouts/session/${loggedWorkoutId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            set: {
              exercise_id: exerciseId,
              set_number:  setNumber,
              reps:        entry.reps,
              weight:      entry.weight,
              rpe:         entry.rpe,
              completed:   entry.completed,
              failed:      entry.failed,
            },
          }),
        });
      } catch {
        // Non-fatal — local state is source of truth during session
      }
    },
    [loggedWorkoutId]
  );

  const handleSetComplete = useCallback(
    (exIdx: number, setIdx: number, entry: Omit<ActiveSetEntry, "set_number">) => {
      setExercises((prev) => {
        const updated = prev.map((ex, i) => {
          if (i !== exIdx) return ex;
          const newSets = ex.sets.map((s, j) =>
            j === setIdx ? { ...s, ...entry, set_number: j + 1 } : s
          );
          return { ...ex, sets: newSets };
        });
        return updated;
      });

      // Persist
      const ex = exercises[exIdx];
      persistSet(ex.exercise_id, setIdx + 1, { ...entry, set_number: setIdx + 1 });

      // Show rest timer
      const restSecs = exercises[exIdx].rest_seconds;
      setRestDuration(restSecs);
      setShowRestTimer(true);

      // Advance set/exercise pointer
      const totalSets = exercises[exIdx].target_sets;
      if (setIdx + 1 < totalSets) {
        setCurrentSetIdx(setIdx + 1);
      } else {
        // Move to next exercise
        const nextExIdx = exIdx + 1;
        if (nextExIdx < exercises.length) {
          setCurrentExerciseIdx(nextExIdx);
          setCurrentSetIdx(0);
          // Scroll to next exercise
          setTimeout(() => {
            document.getElementById(`exercise-${nextExIdx}`)?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }, 100);
        }
      }
    },
    [exercises, persistSet]
  );

  const handleSetFail = useCallback(
    (exIdx: number, setIdx: number) => {
      setExercises((prev) =>
        prev.map((ex, i) =>
          i !== exIdx
            ? ex
            : {
                ...ex,
                sets: ex.sets.map((s, j) =>
                  j === setIdx ? { ...s, completed: true, failed: true } : s
                ),
              }
        )
      );
      const ex = exercises[exIdx];
      persistSet(ex.exercise_id, setIdx + 1, {
        reps: null, weight: null, rpe: null, completed: true, failed: true,
      });

      const totalSets = exercises[exIdx].target_sets;
      if (setIdx + 1 < totalSets) {
        setCurrentSetIdx(setIdx + 1);
      } else {
        const nextExIdx = exIdx + 1;
        if (nextExIdx < exercises.length) {
          setCurrentExerciseIdx(nextExIdx);
          setCurrentSetIdx(0);
        }
      }
    },
    [exercises, persistSet]
  );

  const isAllDone = exercises.every((ex) =>
    ex.sets.filter((s) => s.completed || s.failed).length >= ex.target_sets
  );

  const handleFinish = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowPostWorkout(true);
  };

  const handlePostWorkoutSubmit = async (ratings: {
    workout_rating: number;
    soreness_rating: number;
    energy_rating: number;
    notes: string;
  }) => {
    if (!loggedWorkoutId) return;
    setIsSubmitting(true);
    try {
      await fetch(`/api/workouts/session/${loggedWorkoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration_minutes: Math.round(elapsedSeconds / 60),
          workout_rating:   ratings.workout_rating,
          soreness_rating:  ratings.soreness_rating,
          energy_rating:    ratings.energy_rating,
          notes:            ratings.notes || null,
          started_at:       sessionStartedAt,
        }),
      });
      router.push("/workouts?completed=1");
    } catch {
      // Still navigate even if save fails
      router.push("/workouts");
    }
  };

  const completedExercises = exercises.filter((ex) =>
    ex.sets.filter((s) => s.completed || s.failed).length >= ex.target_sets
  ).length;

  const readinessTierColor =
    readinessScore >= 70 ? "text-green-500" : readinessScore >= 45 ? "text-yellow-500" : "text-red-400";

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Sticky header */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>

            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-foreground truncate">{workout.name}</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock size={10} />
                {formatDuration(elapsedSeconds)}
                <span>·</span>
                <span>
                  {completedExercises}/{exercises.length} exercises
                </span>
                <span className={readinessTierColor}>· {readinessScore}%</span>
              </div>
            </div>

            <button
              onClick={handleFinish}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                isAllDone
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {isAllDone ? "Complete!" : "Finish"}
            </button>
          </div>

          {/* Progress bar */}
          <div className="mx-4 mb-2 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(completedExercises / exercises.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Exercise list */}
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-40">
          {exercises.map((ex, exIdx) => (
            <div key={ex.exercise_id} id={`exercise-${exIdx}`}>
              <ExerciseCard
                exercise={ex}
                isCurrentExercise={exIdx === currentExerciseIdx}
                onSetComplete={(setIdx, entry) => handleSetComplete(exIdx, setIdx, entry)}
                onSetFail={(setIdx) => handleSetFail(exIdx, setIdx)}
                currentSetIndex={exIdx === currentExerciseIdx ? currentSetIdx : -1}
              />
            </div>
          ))}

          {/* Finish button at bottom */}
          <button
            onClick={handleFinish}
            className={`w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
              isAllDone
                ? "bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/20"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            <CheckCircle2 size={20} />
            {isAllDone ? "All Sets Complete — Finish!" : "Finish Workout"}
          </button>
        </div>
      </div>

      {/* Rest timer */}
      {showRestTimer && (
        <RestTimer
          durationSeconds={restDuration}
          onComplete={() => setShowRestTimer(false)}
          onDismiss={() => setShowRestTimer(false)}
        />
      )}

      {/* Post-workout modal */}
      {showPostWorkout && (
        <PostWorkoutModal onSubmit={handlePostWorkoutSubmit} isSubmitting={isSubmitting} />
      )}
    </>
  );
}
