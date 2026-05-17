"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { getAllExercises, MUSCLE_LABELS } from "@/lib/muscles/mapping";
import { saveManualWorkout } from "@/app/actions/workouts";
import type { ExerciseLibrary } from "@/lib/recovery/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type SetRow = {
  id: string;
  weight: string;
  reps: string;
  rpe: string;
};

type ExerciseBlock = {
  id: string;
  exercise: ExerciseLibrary;
  sets: SetRow[];
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2);
}

function newSet(): SetRow {
  return { id: uid(), weight: "", reps: "", rpe: "" };
}

function RatingPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
              value === n
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Exercise picker sheet ────────────────────────────────────────────────────

function ExercisePicker({
  selectedIds,
  onAdd,
  onClose,
}: {
  selectedIds: string[];
  onAdd: (ex: ExerciseLibrary) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const all = getAllExercises();

  const filtered = query.trim()
    ? all.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
    : all;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-muted">
          <X size={16} />
        </button>
        <h2 className="text-base font-semibold flex-1">Add Exercise</h2>
      </div>
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            autoFocus
            type="text"
            placeholder="Search exercises…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-10 rounded-xl bg-muted border border-border pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filtered.map((ex) => {
          const added = selectedIds.includes(ex.id);
          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => { onAdd(ex); onClose(); }}
              disabled={added}
              className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                added
                  ? "border-primary/30 bg-primary/5 opacity-60"
                  : "border-border bg-card hover:bg-muted/50"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{ex.name}</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {ex.primary_muscles.slice(0, 2).map((m) => (
                    <span key={m} className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      {MUSCLE_LABELS[m]}
                    </span>
                  ))}
                </div>
              </div>
              {added && <span className="text-xs text-primary font-medium shrink-0 mt-0.5">Added</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ManualWorkoutLogger() {
  const router = useRouter();

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [workoutRating, setWorkoutRating] = useState<number | null>(null);
  const [sorenessRating, setSorenessRating] = useState<number | null>(null);
  const [energyRating, setEnergyRating] = useState<number | null>(null);

  const [exercises, setExercises] = useState<ExerciseBlock[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Set helpers ──

  function addExercise(ex: ExerciseLibrary) {
    setExercises((prev) => [...prev, { id: uid(), exercise: ex, sets: [newSet()] }]);
  }

  function removeExercise(blockId: string) {
    setExercises((prev) => prev.filter((b) => b.id !== blockId));
  }

  function addSet(blockId: string) {
    setExercises((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, sets: [...b.sets, newSet()] } : b))
    );
  }

  function removeSet(blockId: string, setId: string) {
    setExercises((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, sets: b.sets.filter((s) => s.id !== setId) } : b
      )
    );
  }

  function updateSet(blockId: string, setId: string, field: keyof Omit<SetRow, "id">, value: string) {
    setExercises((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? { ...b, sets: b.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)) }
          : b
      )
    );
  }

  // ── Save ──

  async function handleSave() {
    if (exercises.length === 0) {
      setError("Add at least one exercise.");
      return;
    }
    setSaving(true);
    setError(null);

    const sets = exercises.flatMap((block) =>
      block.sets.map((s, i) => ({
        exercise_id: block.exercise.id,
        set_number:  i + 1,
        weight:      s.weight ? parseFloat(s.weight) : null,
        reps:        s.reps ? parseInt(s.reps, 10) : null,
        rpe:         s.rpe ? parseFloat(s.rpe) : null,
      }))
    );

    const { sessionId, error: err } = await saveManualWorkout({
      performed_at:    new Date(date).toISOString(),
      duration_minutes: duration ? parseInt(duration, 10) : null,
      workout_rating:  workoutRating,
      soreness_rating: sorenessRating,
      energy_rating:   energyRating,
      notes:           notes.trim() || null,
      sets,
    });

    setSaving(false);

    if (err || !sessionId) {
      setError(err ?? "Failed to save. Try again.");
      return;
    }

    router.push(`/workouts/history/${sessionId}`);
  }

  const selectedIds = exercises.map((b) => b.exercise.id);

  return (
    <>
      {showPicker && (
        <ExercisePicker
          selectedIds={selectedIds}
          onAdd={addExercise}
          onClose={() => setShowPicker(false)}
        />
      )}

      <div className="space-y-6">
        {/* Meta */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-medium">Date</label>
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 rounded-xl bg-muted border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-medium">Duration (min)</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 60"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="h-10 rounded-xl bg-muted border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        {/* Exercise blocks */}
        <div className="space-y-4">
          {exercises.map((block) => (
            <div key={block.id} className="rounded-xl border border-border bg-card">
              {/* Exercise header */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                <p className="flex-1 text-sm font-semibold text-foreground">{block.exercise.name}</p>
                <button
                  type="button"
                  onClick={() => removeExercise(block.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Set rows */}
              <div className="p-3 space-y-2">
                {/* Column headers */}
                <div className="grid grid-cols-[2rem_1fr_1fr_1fr_1.5rem] gap-2 px-1">
                  <span className="text-xs text-muted-foreground text-center">#</span>
                  <span className="text-xs text-muted-foreground text-center">kg</span>
                  <span className="text-xs text-muted-foreground text-center">Reps</span>
                  <span className="text-xs text-muted-foreground text-center">RPE</span>
                  <span />
                </div>

                {block.sets.map((s, i) => (
                  <div key={s.id} className="grid grid-cols-[2rem_1fr_1fr_1fr_1.5rem] gap-2 items-center">
                    <span className="text-xs text-muted-foreground text-center">{i + 1}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="—"
                      value={s.weight}
                      onChange={(e) => updateSet(block.id, s.id, "weight", e.target.value)}
                      className="h-8 rounded-lg bg-muted border border-border px-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="—"
                      value={s.reps}
                      onChange={(e) => updateSet(block.id, s.id, "reps", e.target.value)}
                      className="h-8 rounded-lg bg-muted border border-border px-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <input
                      type="number"
                      min="1"
                      max="10"
                      step="0.5"
                      placeholder="—"
                      value={s.rpe}
                      onChange={(e) => updateSet(block.id, s.id, "rpe", e.target.value)}
                      className="h-8 rounded-lg bg-muted border border-border px-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    {block.sets.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeSet(block.id, s.id)}
                        className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X size={12} />
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addSet(block.id)}
                  className="w-full mt-1 h-8 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus size={12} />
                  Add set
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="w-full h-11 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add exercise
          </button>
        </div>

        {/* Ratings */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">How did it feel?</p>
          <RatingPicker label="Workout rating" value={workoutRating} onChange={setWorkoutRating} />
          <RatingPicker label="Energy level" value={energyRating} onChange={setEnergyRating} />
          <RatingPicker label="Soreness after" value={sorenessRating} onChange={setSorenessRating} />
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground font-medium">Notes (optional)</label>
          <textarea
            rows={3}
            placeholder="How did it go?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-xl bg-muted border border-border px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save Workout"}
        </button>
      </div>
    </>
  );
}
