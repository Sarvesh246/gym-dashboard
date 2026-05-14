"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/SectionCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const MUSCLE_GROUPS = [
  "chest",
  "upper_back",
  "lats",
  "traps",
  "front_delts",
  "side_delts",
  "rear_delts",
  "biceps",
  "triceps",
  "forearms",
  "core",
  "lower_back",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
];

interface RecoveryNotesFormProps {
  onSubmit: (notes: {
    muscle_group: string;
    soreness_level: number;
    movement_restriction?: string;
    notes?: string;
    is_injury: boolean;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function RecoveryNotesForm({ onSubmit, isLoading = false }: RecoveryNotesFormProps) {
  const [muscleGroup, setMuscleGroup] = useState<string>("");
  const [sorenessLevel, setSorenessLevel] = useState<number>(5);
  const [movementRestriction, setMovementRestriction] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isInjury, setIsInjury] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!muscleGroup) {
      setError("Please select a muscle group");
      return;
    }

    try {
      await onSubmit({
        muscle_group: muscleGroup,
        soreness_level: sorenessLevel,
        movement_restriction: movementRestriction || undefined,
        notes: notes || undefined,
        is_injury: isInjury,
      });
      setSuccess(true);
      // Reset form
      setMuscleGroup("");
      setSorenessLevel(5);
      setMovementRestriction("");
      setNotes("");
      setIsInjury(false);
    } catch (err) {
      setError((err as Error).message || "Failed to save recovery notes");
    }
  }

  return (
    <SectionCard title="Recovery Notes" subtitle="Log muscle soreness, injuries, or movement restrictions">
      <form onSubmit={handleSubmit} className="space-y-5">
          {/* Muscle Group Select */}
          <div className="space-y-2">
            <Label htmlFor="muscle-group" className="text-sm font-medium">
              Muscle Group
            </Label>
            <Select value={muscleGroup} onValueChange={setMuscleGroup}>
              <SelectTrigger id="muscle-group">
                <SelectValue placeholder="Select muscle group..." />
              </SelectTrigger>
              <SelectContent>
                {MUSCLE_GROUPS.map((muscle) => (
                  <SelectItem key={muscle} value={muscle}>
                    {muscle.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Soreness Level */}
          <div className="space-y-2">
            <Label htmlFor="soreness" className="text-sm font-medium">
              Soreness Level: {sorenessLevel}/10
            </Label>
            <input
              id="soreness"
              type="range"
              min={1}
              max={10}
              step={1}
              value={sorenessLevel}
              onChange={(e) => setSorenessLevel(parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {sorenessLevel <= 2 ? "None 😊" : sorenessLevel <= 4 ? "Mild 😐" : sorenessLevel <= 7 ? "Moderate 😕" : "Severe 😫"}
            </p>
          </div>

          {/* Movement Restriction */}
          <div className="space-y-2">
            <Label htmlFor="restriction" className="text-sm font-medium">
              Movement Restriction (optional)
            </Label>
            <input
              id="restriction"
              type="text"
              value={movementRestriction}
              onChange={(e) => setMovementRestriction(e.target.value)}
              placeholder="e.g., shoulder abduction, knee extension"
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm placeholder-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">Specific movements that cause discomfort</p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes (optional)
            </Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g., 'tight after deadlifts', 'rolling helps', 'improved with stretching'"
              className="w-full min-h-24 resize-none rounded border border-input bg-background px-3 py-2 text-sm placeholder-muted-foreground"
            />
          </div>

          {/* Is Injury Checkbox */}
          <div className="flex items-center space-x-2 border-t pt-4">
            <input
              id="is-injury"
              type="checkbox"
              checked={isInjury}
              onChange={(e) => setIsInjury(e.target.checked)}
              className="w-4 h-4 rounded border border-input cursor-pointer"
            />
            <Label htmlFor="is-injury" className="text-sm font-medium cursor-pointer">
              Flag as Injury (suppresses readiness)
            </Label>
          </div>

          {isInjury && (
            <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 p-2 rounded">
              ⚠️ Marking as injury will temporarily reduce your readiness score and may suppress certain training recommendations.
            </div>
          )}

          {/* Error */}
          {error && <div className="text-sm text-destructive">{error}</div>}

          {/* Success */}
          {success && <div className="text-sm text-green-600">Recovery notes saved successfully ✓</div>}

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={isLoading || !muscleGroup}>
            {isLoading ? "Saving..." : "Save Recovery Notes"}
          </Button>
        </form>
    </SectionCard>
  );
}
