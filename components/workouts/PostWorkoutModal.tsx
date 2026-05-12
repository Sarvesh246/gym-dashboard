"use client";

import { useState } from "react";
import { Star, Zap, Activity } from "lucide-react";

interface Props {
  onSubmit: (data: {
    workout_rating: number;
    soreness_rating: number;
    energy_rating: number;
    notes: string;
  }) => void;
  isSubmitting: boolean;
}

function RatingRow({
  label,
  icon: Icon,
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  value: number;
  onChange: (v: number) => void;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
              value === n
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

export function PostWorkoutModal({ onSubmit, isSubmitting }: Props) {
  const [workoutRating, setWorkoutRating] = useState(3);
  const [sorenessRating, setSorenessRating] = useState(2);
  const [energyRating, setEnergyRating] = useState(3);
  const [notes, setNotes] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card rounded-3xl border border-border shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Workout Complete!</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            How did it feel? This helps calibrate your recovery.
          </p>
        </div>

        <div className="p-5 space-y-6 max-h-[60vh] overflow-y-auto">
          <RatingRow
            label="Workout Quality"
            icon={Star}
            value={workoutRating}
            onChange={setWorkoutRating}
            lowLabel="Terrible"
            highLabel="Excellent"
          />
          <RatingRow
            label="Soreness Level"
            icon={Activity}
            value={sorenessRating}
            onChange={setSorenessRating}
            lowLabel="None"
            highLabel="Very Sore"
          />
          <RatingRow
            label="Energy Level"
            icon={Zap}
            value={energyRating}
            onChange={setEnergyRating}
            lowLabel="Depleted"
            highLabel="Great"
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did the workout feel? Any PRs?"
              rows={3}
              className="w-full rounded-xl bg-muted border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>
        </div>

        <div className="p-5 border-t border-border">
          <button
            onClick={() =>
              onSubmit({
                workout_rating:  workoutRating,
                soreness_rating: sorenessRating,
                energy_rating:   energyRating,
                notes,
              })
            }
            disabled={isSubmitting}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Saving..." : "Save Workout"}
          </button>
        </div>
      </div>
    </div>
  );
}
