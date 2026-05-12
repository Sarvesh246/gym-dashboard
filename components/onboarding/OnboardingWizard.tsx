"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Activity, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { saveOnboardingStep, completeOnboarding } from "@/app/actions/onboarding";
import { useUnitSystem } from "@/lib/unit-system-context";
import { kgToLbs, lbsToKg, cmToFtIn, ftInToCm, formatHeight, formatWeight } from "@/lib/units";
import type {
  Profile,
  Goal,
  Sex,
  TrainingLevel,
  EquipmentAccess,
  InjuryFlag,
  TriLevel,
  SplitPreference,
  ProfileUpdate,
} from "@/lib/supabase/types";

// ─── Wizard State ─────────────────────────────────────────────────────────────

interface WizardData {
  goal: Goal | "";
  age: string;
  sex: Sex | "";
  height_cm: string;
  weight_kg: string;
  training_level: TrainingLevel | "";
  workout_days_per_week: number;
  session_duration_minutes: number;
  preferred_days: string[];
  equipment_access: EquipmentAccess | "";
  injury_flags: InjuryFlag[];
  sleep_quality: TriLevel | "";
  stress_level: TriLevel | "";
  cardio_preference: TriLevel | "";
  split_preference: SplitPreference | "";
}

const emptyData: WizardData = {
  goal: "",
  age: "",
  sex: "",
  height_cm: "",
  weight_kg: "",
  training_level: "",
  workout_days_per_week: 0,
  session_duration_minutes: 0,
  preferred_days: [],
  equipment_access: "",
  injury_flags: [],
  sleep_quality: "",
  stress_level: "",
  cardio_preference: "",
  split_preference: "",
};

// ─── Animation ────────────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 44 : -44, opacity: 0 }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -44 : 44,
    opacity: 0,
    transition: { duration: 0.18 },
  }),
};

// ─── Option Button ────────────────────────────────────────────────────────────

function OptionButton({
  selected,
  onClick,
  children,
  multi = false,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-all",
        selected
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:bg-muted/50"
      )}
    >
      {children}
      {selected && (
        <div
          className={cn(
            "ml-auto shrink-0 w-5 h-5 flex items-center justify-center bg-primary",
            multi ? "rounded-md" : "rounded-full"
          )}
        >
          <Check size={12} className="text-primary-foreground" />
        </div>
      )}
    </button>
  );
}

// ─── Step 1: Goal ─────────────────────────────────────────────────────────────

const GOALS: { id: Goal; label: string; description: string; emoji: string }[] = [
  { id: "aesthetics", label: "Aesthetics", description: "Look and feel your best", emoji: "✨" },
  { id: "fat_loss", label: "Fat Loss", description: "Reduce body fat", emoji: "🔥" },
  { id: "muscle_gain", label: "Muscle Gain", description: "Build size and strength", emoji: "💪" },
  { id: "strength", label: "Strength", description: "Lift heavier, get stronger", emoji: "🏋️" },
  { id: "hybrid", label: "Hybrid", description: "Balanced performance", emoji: "⚡" },
];

function StepGoal({
  value,
  onChange,
}: {
  value: Goal | "";
  onChange: (v: Goal) => void;
}) {
  return (
    <div className="space-y-3">
      {GOALS.map((g) => (
        <OptionButton key={g.id} selected={value === g.id} onClick={() => onChange(g.id)}>
          <span className="text-2xl shrink-0 w-10 text-center">{g.emoji}</span>
          <div>
            <p className="text-sm font-semibold text-foreground">{g.label}</p>
            <p className="text-xs text-muted-foreground">{g.description}</p>
          </div>
        </OptionButton>
      ))}
    </div>
  );
}

// ─── Step 2: Body Stats ───────────────────────────────────────────────────────

const SEX_OPTIONS: { id: Sex; label: string }[] = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "other", label: "Other" },
];

function StepBodyStats({
  data,
  onChange,
}: {
  data: Pick<WizardData, "age" | "sex" | "height_cm" | "weight_kg">;
  onChange: (key: keyof WizardData, val: string | Sex) => void;
}) {
  const { system } = useUnitSystem();

  // Local imperial display state (ft/in and lbs), derived from metric wizard state
  const initFtIn = data.height_cm ? cmToFtIn(parseFloat(data.height_cm)) : { ft: 0, inches: 0 };
  const [heightFt, setHeightFt] = useState(data.height_cm ? String(initFtIn.ft) : "");
  const [heightIn, setHeightIn] = useState(data.height_cm ? String(initFtIn.inches) : "");
  const [weightLbs, setWeightLbs] = useState(
    data.weight_kg ? String(kgToLbs(parseFloat(data.weight_kg))) : ""
  );

  function handleHeightFt(val: string) {
    setHeightFt(val);
    const ft = parseInt(val, 10);
    const inches = parseInt(heightIn, 10) || 0;
    if (!isNaN(ft)) onChange("height_cm", String(ftInToCm(ft, inches)));
  }

  function handleHeightIn(val: string) {
    setHeightIn(val);
    const ft = parseInt(heightFt, 10) || 0;
    const inches = parseInt(val, 10);
    if (!isNaN(inches)) onChange("height_cm", String(ftInToCm(ft, inches)));
  }

  function handleWeightLbs(val: string) {
    setWeightLbs(val);
    const lbs = parseFloat(val);
    if (!isNaN(lbs)) onChange("weight_kg", String(lbsToKg(lbs)));
  }

  return (
    <div className="space-y-5">
      {/* Sex */}
      <div>
        <Label className="text-sm font-medium text-foreground mb-3 block">Sex</Label>
        <div className="grid grid-cols-3 gap-2">
          {SEX_OPTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange("sex", s.id)}
              className={cn(
                "flex items-center justify-center rounded-xl border py-3 text-sm font-medium transition-all",
                data.sex === s.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Age */}
      <div>
        <Label htmlFor="age" className="text-sm font-medium text-foreground mb-2 block">Age</Label>
        <div className="relative">
          <Input
            id="age"
            type="number"
            inputMode="decimal"
            placeholder="28"
            value={data.age}
            onChange={(e) => onChange("age", e.target.value)}
            className="pr-16 rounded-xl h-12 text-base"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
            years
          </span>
        </div>
      </div>

      {/* Height */}
      {system === "imperial" ? (
        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">Height</Label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="5"
                value={heightFt}
                onChange={(e) => handleHeightFt(e.target.value)}
                className="pr-10 rounded-xl h-12 text-base"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                ft
              </span>
            </div>
            <div className="relative flex-1">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="10"
                value={heightIn}
                onChange={(e) => handleHeightIn(e.target.value)}
                className="pr-10 rounded-xl h-12 text-base"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                in
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <Label htmlFor="height_cm" className="text-sm font-medium text-foreground mb-2 block">Height</Label>
          <div className="relative">
            <Input
              id="height_cm"
              type="number"
              inputMode="decimal"
              placeholder="178"
              value={data.height_cm}
              onChange={(e) => onChange("height_cm", e.target.value)}
              className="pr-16 rounded-xl h-12 text-base"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
              cm
            </span>
          </div>
        </div>
      )}

      {/* Weight */}
      {system === "imperial" ? (
        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">Weight</Label>
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="180"
              value={weightLbs}
              onChange={(e) => handleWeightLbs(e.target.value)}
              className="pr-16 rounded-xl h-12 text-base"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
              lbs
            </span>
          </div>
        </div>
      ) : (
        <div>
          <Label htmlFor="weight_kg" className="text-sm font-medium text-foreground mb-2 block">Weight</Label>
          <div className="relative">
            <Input
              id="weight_kg"
              type="number"
              inputMode="decimal"
              placeholder="82"
              value={data.weight_kg}
              onChange={(e) => onChange("weight_kg", e.target.value)}
              className="pr-16 rounded-xl h-12 text-base"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
              kg
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Training Level ───────────────────────────────────────────────────

const TRAINING_LEVELS: { id: TrainingLevel; label: string; description: string }[] = [
  { id: "beginner", label: "Beginner", description: "0–1 year of consistent training" },
  { id: "intermediate", label: "Intermediate", description: "1–3 years of consistent training" },
  { id: "advanced", label: "Advanced", description: "3+ years, strong program knowledge" },
  { id: "returning", label: "Returning", description: "Getting back after a break" },
];

function StepTrainingLevel({
  value,
  onChange,
}: {
  value: TrainingLevel | "";
  onChange: (v: TrainingLevel) => void;
}) {
  return (
    <div className="space-y-3">
      {TRAINING_LEVELS.map((l) => (
        <OptionButton key={l.id} selected={value === l.id} onClick={() => onChange(l.id)}>
          <div>
            <p className="text-sm font-semibold text-foreground">{l.label}</p>
            <p className="text-xs text-muted-foreground">{l.description}</p>
          </div>
        </OptionButton>
      ))}
    </div>
  );
}

// ─── Step 4: Training Availability ───────────────────────────────────────────

const DURATIONS = [30, 45, 60, 75, 90];
const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function StepAvailability({
  data,
  onChange,
}: {
  data: Pick<WizardData, "workout_days_per_week" | "session_duration_minutes" | "preferred_days">;
  onChange: (key: keyof WizardData, val: number | string[]) => void;
}) {
  function toggleDay(day: string) {
    const current = data.preferred_days;
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    onChange("preferred_days", next);
  }

  return (
    <div className="space-y-6">
      {/* Days per week */}
      <div>
        <Label className="text-sm font-medium text-foreground mb-3 block">Days per week</Label>
        <div className="grid grid-cols-3 gap-2.5">
          {[2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange("workout_days_per_week", n)}
              className={cn(
                "flex flex-col items-center justify-center rounded-2xl border py-4 transition-all",
                data.workout_days_per_week === n
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:bg-muted/50"
              )}
            >
              <span
                className={cn(
                  "text-xl font-bold",
                  data.workout_days_per_week === n ? "text-primary" : "text-foreground"
                )}
              >
                {n}x
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">/ week</span>
            </button>
          ))}
        </div>
      </div>

      {/* Session duration */}
      <div>
        <Label className="text-sm font-medium text-foreground mb-3 block">
          Session duration
        </Label>
        <div className="flex gap-2 flex-wrap">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onChange("session_duration_minutes", d)}
              className={cn(
                "rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
                data.session_duration_minutes === d
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50"
              )}
            >
              {d} min
            </button>
          ))}
        </div>
      </div>

      {/* Preferred days */}
      <div>
        <Label className="text-sm font-medium text-foreground mb-3 block">
          Preferred days{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS_OF_WEEK.map((label, i) => {
            const key = DAY_KEYS[i];
            const selected = data.preferred_days.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleDay(key)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border py-2.5 transition-all",
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:bg-muted/50"
                )}
              >
                <span
                  className={cn(
                    "text-[11px] font-semibold",
                    selected ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Equipment ────────────────────────────────────────────────────────

const EQUIPMENT_OPTIONS: { id: EquipmentAccess; label: string; description: string; emoji: string }[] = [
  { id: "full_gym", label: "Full Gym", description: "Barbells, machines, cables, dumbbells", emoji: "🏋️" },
  { id: "home_gym", label: "Home Gym", description: "Dumbbells, bench, some equipment", emoji: "🏠" },
  { id: "limited", label: "Limited", description: "Bodyweight or minimal tools", emoji: "🎽" },
];

function StepEquipment({
  value,
  onChange,
}: {
  value: EquipmentAccess | "";
  onChange: (v: EquipmentAccess) => void;
}) {
  return (
    <div className="space-y-3">
      {EQUIPMENT_OPTIONS.map((e) => (
        <OptionButton key={e.id} selected={value === e.id} onClick={() => onChange(e.id)}>
          <span className="text-2xl shrink-0 w-10 text-center">{e.emoji}</span>
          <div>
            <p className="text-sm font-semibold text-foreground">{e.label}</p>
            <p className="text-xs text-muted-foreground">{e.description}</p>
          </div>
        </OptionButton>
      ))}
    </div>
  );
}

// ─── Step 6: Injuries ─────────────────────────────────────────────────────────

const INJURY_OPTIONS: { id: InjuryFlag; label: string }[] = [
  { id: "shoulders", label: "Shoulders" },
  { id: "knees", label: "Knees" },
  { id: "lower_back", label: "Lower Back" },
  { id: "wrists", label: "Wrists" },
  { id: "none", label: "No injuries" },
];

function StepInjuries({
  value,
  onChange,
}: {
  value: InjuryFlag[];
  onChange: (v: InjuryFlag[]) => void;
}) {
  function toggle(id: InjuryFlag) {
    if (id === "none") {
      onChange(value.includes("none") ? [] : ["none"]);
      return;
    }
    const without = value.filter((x) => x !== "none");
    const next = without.includes(id)
      ? without.filter((x) => x !== id)
      : [...without, id];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {INJURY_OPTIONS.map((inj) => (
        <OptionButton
          key={inj.id}
          selected={value.includes(inj.id)}
          onClick={() => toggle(inj.id)}
          multi
        >
          <p className="text-sm font-semibold text-foreground">{inj.label}</p>
        </OptionButton>
      ))}
    </div>
  );
}

// ─── Step 7: Lifestyle ────────────────────────────────────────────────────────

const TRI_OPTIONS: { id: TriLevel; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

function TriSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TriLevel | "";
  onChange: (v: TriLevel) => void;
}) {
  return (
    <div>
      <Label className="text-sm font-medium text-foreground mb-2.5 block">{label}</Label>
      <div className="grid grid-cols-3 gap-2">
        {TRI_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "rounded-xl border py-3 text-sm font-medium transition-all",
              value === opt.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted/50"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepLifestyle({
  data,
  onChange,
}: {
  data: Pick<WizardData, "sleep_quality" | "stress_level" | "cardio_preference">;
  onChange: (key: keyof WizardData, val: TriLevel) => void;
}) {
  return (
    <div className="space-y-6">
      <TriSelect
        label="Sleep quality"
        value={data.sleep_quality}
        onChange={(v) => onChange("sleep_quality", v)}
      />
      <TriSelect
        label="Stress level"
        value={data.stress_level}
        onChange={(v) => onChange("stress_level", v)}
      />
      <TriSelect
        label="Cardio frequency preference"
        value={data.cardio_preference}
        onChange={(v) => onChange("cardio_preference", v)}
      />
    </div>
  );
}

// ─── Step 8: Workout Preferences ─────────────────────────────────────────────

const SPLIT_OPTIONS: { id: SplitPreference; label: string; description: string }[] = [
  { id: "ppl", label: "Push / Pull / Legs", description: "Classic 3- or 6-day split" },
  { id: "upper_lower", label: "Upper / Lower", description: "4-day alternating split" },
  { id: "bro_split", label: "Bro Split", description: "One muscle group per day" },
  { id: "full_body", label: "Full Body", description: "Hit everything each session" },
  { id: "custom", label: "No preference", description: "Let the AI decide" },
];

function StepSplitPreference({
  value,
  onChange,
}: {
  value: SplitPreference | "";
  onChange: (v: SplitPreference) => void;
}) {
  return (
    <div className="space-y-3">
      {SPLIT_OPTIONS.map((s) => (
        <OptionButton key={s.id} selected={value === s.id} onClick={() => onChange(s.id)}>
          <div>
            <p className="text-sm font-semibold text-foreground">{s.label}</p>
            <p className="text-xs text-muted-foreground">{s.description}</p>
          </div>
        </OptionButton>
      ))}
    </div>
  );
}

// ─── Step 9: Confirm ──────────────────────────────────────────────────────────

const GOAL_LABELS: Record<Goal, string> = {
  aesthetics: "Aesthetics",
  fat_loss: "Fat Loss",
  muscle_gain: "Muscle Gain",
  strength: "Strength",
  hybrid: "Hybrid",
};

const EQUIPMENT_LABELS: Record<EquipmentAccess, string> = {
  full_gym: "Full Gym",
  home_gym: "Home Gym",
  limited: "Limited",
};

const SPLIT_LABELS: Record<SplitPreference, string> = {
  ppl: "Push/Pull/Legs",
  upper_lower: "Upper/Lower",
  bro_split: "Bro Split",
  full_body: "Full Body",
  custom: "No preference",
};

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 px-4 py-3.5">
      <span className="text-sm text-muted-foreground whitespace-nowrap">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">
        {value || "—"}
      </span>
    </div>
  );
}

function StepConfirm({ data }: { data: WizardData }) {
  const { system } = useUnitSystem();

  const heightDisplay = data.height_cm
    ? formatHeight(parseFloat(data.height_cm), system)
    : "";
  const weightDisplay = data.weight_kg
    ? formatWeight(parseFloat(data.weight_kg), system)
    : "";

  return (
    <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
      <ConfirmRow label="Goal" value={data.goal ? GOAL_LABELS[data.goal] : ""} />
      <ConfirmRow
        label="Body"
        value={[
          data.sex,
          data.age ? `${data.age} yrs` : "",
          heightDisplay,
          weightDisplay,
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      <ConfirmRow
        label="Training"
        value={
          data.training_level
            ? data.training_level.charAt(0).toUpperCase() +
              data.training_level.slice(1)
            : ""
        }
      />
      <ConfirmRow
        label="Schedule"
        value={[
          data.workout_days_per_week ? `${data.workout_days_per_week}x/week` : "",
          data.session_duration_minutes
            ? `${data.session_duration_minutes} min`
            : "",
        ]
          .filter(Boolean)
          .join(", ")}
      />
      <ConfirmRow
        label="Equipment"
        value={data.equipment_access ? EQUIPMENT_LABELS[data.equipment_access] : ""}
      />
      <ConfirmRow
        label="Injuries"
        value={
          data.injury_flags.length
            ? data.injury_flags
                .map((f) => f.charAt(0).toUpperCase() + f.slice(1).replace("_", " "))
                .join(", ")
            : "None"
        }
      />
      <ConfirmRow
        label="Lifestyle"
        value={[
          data.sleep_quality ? `Sleep: ${data.sleep_quality}` : "",
          data.stress_level ? `Stress: ${data.stress_level}` : "",
          data.cardio_preference ? `Cardio: ${data.cardio_preference}` : "",
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      <ConfirmRow
        label="Split"
        value={data.split_preference ? SPLIT_LABELS[data.split_preference] : ""}
      />
    </div>
  );
}

// ─── Step Config ──────────────────────────────────────────────────────────────

const STEP_TITLES = [
  "What's your primary goal?",
  "Tell us about yourself",
  "Your training experience",
  "Training availability",
  "Equipment access",
  "Any injuries or limitations?",
  "Your lifestyle",
  "Workout style preference",
  "Your profile summary",
];

const STEP_SUBTITLES = [
  "We'll shape your entire program around this.",
  "Helps calibrate intensity and recommendations.",
  "We'll tune progression to your level.",
  "Be honest — consistency beats perfection.",
  "Select what's available to you.",
  "Select all that apply. This protects you from unsuitable exercises.",
  "Recovery and stress shape how hard you can push.",
  "We'll follow this structure or let the AI decide.",
  "Everything looks good. Ready to build your plan.",
];

const TOTAL_STEPS = 9;

// ─── Can Continue ─────────────────────────────────────────────────────────────

function canContinue(step: number, data: WizardData): boolean {
  switch (step) {
    case 0:
      return !!data.goal;
    case 1:
      return !!(data.age && data.sex && data.height_cm && data.weight_kg);
    case 2:
      return !!data.training_level;
    case 3:
      return data.workout_days_per_week > 0 && data.session_duration_minutes > 0;
    case 4:
      return !!data.equipment_access;
    case 5:
      return data.injury_flags.length > 0;
    case 6:
      return !!(data.sleep_quality && data.stress_level && data.cardio_preference);
    case 7:
      return !!data.split_preference;
    case 8:
      return true;
    default:
      return false;
  }
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

interface Props {
  initialStep: number;
  initialData: Partial<Profile>;
}

function profileToWizard(p: Partial<Profile>): Partial<WizardData> {
  return {
    goal: (p.goal as Goal) ?? "",
    age: p.age?.toString() ?? "",
    sex: (p.sex as Sex) ?? "",
    height_cm: p.height_cm?.toString() ?? "",
    weight_kg: p.weight_kg?.toString() ?? "",
    training_level: (p.training_level as TrainingLevel) ?? "",
    workout_days_per_week: p.workout_days_per_week ?? 0,
    session_duration_minutes: p.session_duration_minutes ?? 0,
    preferred_days: p.preferred_days ?? [],
    equipment_access: (p.equipment_access as EquipmentAccess) ?? "",
    injury_flags: (p.injury_flags as InjuryFlag[]) ?? [],
    sleep_quality: (p.sleep_quality as TriLevel) ?? "",
    stress_level: (p.stress_level as TriLevel) ?? "",
    cardio_preference: (p.cardio_preference as TriLevel) ?? "",
    split_preference: (p.split_preference as SplitPreference) ?? "",
  };
}

function wizardToProfile(d: WizardData): ProfileUpdate {
  return {
    goal: (d.goal as Goal) || null,
    age: d.age ? parseInt(d.age, 10) : null,
    sex: (d.sex as Sex) || null,
    height_cm: d.height_cm ? parseFloat(d.height_cm) : null,
    weight_kg: d.weight_kg ? parseFloat(d.weight_kg) : null,
    training_level: (d.training_level as TrainingLevel) || null,
    workout_days_per_week: d.workout_days_per_week || null,
    session_duration_minutes: d.session_duration_minutes || null,
    preferred_days: d.preferred_days.length ? d.preferred_days : null,
    equipment_access: (d.equipment_access as EquipmentAccess) || null,
    injury_flags: d.injury_flags.length ? (d.injury_flags as InjuryFlag[]) : null,
    sleep_quality: (d.sleep_quality as TriLevel) || null,
    stress_level: (d.stress_level as TriLevel) || null,
    cardio_preference: (d.cardio_preference as TriLevel) || null,
    split_preference: (d.split_preference as SplitPreference) || null,
  };
}

export function OnboardingWizard({ initialStep, initialData }: Props) {
  const [step, setStep] = useState(Math.min(initialStep, TOTAL_STEPS - 1));
  const [direction, setDirection] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState<WizardData>({
    ...emptyData,
    ...profileToWizard(initialData),
  });

  function set<K extends keyof WizardData>(key: K, val: WizardData[K]) {
    setData((prev) => ({ ...prev, [key]: val }));
  }

  async function goNext() {
    if (step >= TOTAL_STEPS - 1) return;
    setIsSaving(true);
    await saveOnboardingStep(step + 1, wizardToProfile(data));
    setIsSaving(false);
    setDirection(1);
    setStep((s) => s + 1);
  }

  function goBack() {
    if (step <= 0) return;
    setDirection(-1);
    setStep((s) => s - 1);
  }

  async function handleComplete() {
    setIsSaving(true);
    await completeOnboarding(wizardToProfile(data));
    // redirect happens server-side
  }

  const isLastStep = step === TOTAL_STEPS - 1;
  const ready = canContinue(step, data);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 1rem)" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Activity size={14} className="text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold text-foreground">GymOS</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {step + 1} of {TOTAL_STEPS}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="px-5 mb-8">
        <Progress value={((step + 1) / TOTAL_STEPS) * 100} className="h-1.5" />
      </div>

      {/* Content */}
      <div className="flex-1 px-5 overflow-hidden">
        <div className="max-w-lg mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground leading-tight mb-2">
              {STEP_TITLES[step]}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {STEP_SUBTITLES[step]}
            </p>
          </div>

          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {step === 0 && (
                <StepGoal value={data.goal} onChange={(v) => set("goal", v)} />
              )}
              {step === 1 && (
                <StepBodyStats
                  data={data}
                  onChange={(key, val) => set(key as keyof WizardData, val as never)}
                />
              )}
              {step === 2 && (
                <StepTrainingLevel
                  value={data.training_level}
                  onChange={(v) => set("training_level", v)}
                />
              )}
              {step === 3 && (
                <StepAvailability
                  data={data}
                  onChange={(key, val) => set(key, val as never)}
                />
              )}
              {step === 4 && (
                <StepEquipment
                  value={data.equipment_access}
                  onChange={(v) => set("equipment_access", v)}
                />
              )}
              {step === 5 && (
                <StepInjuries
                  value={data.injury_flags}
                  onChange={(v) => set("injury_flags", v)}
                />
              )}
              {step === 6 && (
                <StepLifestyle
                  data={data}
                  onChange={(key, val) => set(key, val)}
                />
              )}
              {step === 7 && (
                <StepSplitPreference
                  value={data.split_preference}
                  onChange={(v) => set("split_preference", v)}
                />
              )}
              {step === 8 && <StepConfirm data={data} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <div
        className="px-5 py-6 border-t border-border mt-8"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1.5rem)",
        }}
      >
        <div className="max-w-lg mx-auto flex gap-3">
          {step > 0 && (
            <Button
              variant="outline"
              size="lg"
              onClick={goBack}
              disabled={isSaving}
              className="rounded-2xl h-14 flex-none px-5"
            >
              <ChevronLeft size={18} />
            </Button>
          )}
          <Button
            size="lg"
            onClick={isLastStep ? handleComplete : goNext}
            disabled={!ready || isSaving}
            className="flex-1 rounded-2xl h-14 text-base font-semibold"
          >
            {isSaving
              ? "Saving…"
              : isLastStep
              ? "Complete Setup"
              : "Continue"}
            {!isLastStep && !isSaving && <ChevronRight size={18} className="ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
