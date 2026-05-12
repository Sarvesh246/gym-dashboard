"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { updateProfile } from "@/app/actions/profile";
import { useUnitSystem } from "@/lib/unit-system-context";
import { kgToLbs, lbsToKg, cmToFtIn, ftInToCm } from "@/lib/units";
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

// ─── Shared Sub-components ────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      {children}
    </div>
  );
}

function PillSelect<T extends string>({
  options,
  value,
  onChange,
  multi = false,
}: {
  options: { id: T; label: string }[];
  value: T | T[] | null;
  onChange: (v: T | T[]) => void;
  multi?: boolean;
}) {
  function isSelected(id: T) {
    if (multi) return Array.isArray(value) && value.includes(id);
    return value === id;
  }

  function toggle(id: T) {
    if (!multi) {
      onChange(id);
      return;
    }
    const current = Array.isArray(value) ? value : [];
    if (id === ("none" as T)) {
      onChange(current.includes("none" as T) ? [] : (["none"] as T[]));
      return;
    }
    const without = current.filter((x) => x !== ("none" as T));
    const next = without.includes(id)
      ? without.filter((x) => x !== id)
      : [...without, id];
    onChange(next as T[]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => toggle(opt.id)}
          className={cn(
            "rounded-xl border px-3.5 py-2 text-sm font-medium transition-all",
            isSelected(opt.id)
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border bg-background text-muted-foreground hover:bg-muted/50"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function NumericField({
  label,
  value,
  onChange,
  suffix,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  suffix: string;
  placeholder: string;
}) {
  return (
    <div>
      <Label className="text-sm font-medium text-foreground mb-2 block">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          placeholder={placeholder}
          value={value ?? ""}
          onChange={(e) =>
            onChange(e.target.value ? parseFloat(e.target.value) : null)
          }
          className="pr-14 rounded-xl h-11 text-sm"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function WeightImperialField({
  valueKg,
  onChange,
}: {
  valueKg: number | null;
  onChange: (kg: number | null) => void;
}) {
  const [lbs, setLbs] = useState(valueKg != null ? String(kgToLbs(valueKg)) : "");

  function handleChange(v: string) {
    setLbs(v);
    const parsed = parseFloat(v);
    onChange(!isNaN(parsed) ? lbsToKg(parsed) : null);
  }

  return (
    <div>
      <Label className="text-sm font-medium text-foreground mb-2 block">Weight</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          placeholder="180"
          value={lbs}
          onChange={(e) => handleChange(e.target.value)}
          className="pr-14 rounded-xl h-11 text-sm"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
          lbs
        </span>
      </div>
    </div>
  );
}

function HeightImperialField({
  valueCm,
  onChange,
}: {
  valueCm: number | null;
  onChange: (cm: number | null) => void;
}) {
  const derived = valueCm != null ? cmToFtIn(valueCm) : { ft: 0, inches: 0 };
  const [ft, setFt] = useState(valueCm != null ? String(derived.ft) : "");
  const [inches, setInches] = useState(valueCm != null ? String(derived.inches) : "");

  function handleFt(v: string) {
    setFt(v);
    const ftVal = parseInt(v, 10);
    const inVal = parseInt(inches, 10) || 0;
    onChange(!isNaN(ftVal) ? ftInToCm(ftVal, inVal) : null);
  }

  function handleIn(v: string) {
    setInches(v);
    const ftVal = parseInt(ft, 10) || 0;
    const inVal = parseInt(v, 10);
    onChange(!isNaN(inVal) ? ftInToCm(ftVal, inVal) : null);
  }

  return (
    <div>
      <Label className="text-sm font-medium text-foreground mb-2 block">Height</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="5"
            value={ft}
            onChange={(e) => handleFt(e.target.value)}
            className="pr-10 rounded-xl h-11 text-sm"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
            ft
          </span>
        </div>
        <div className="relative flex-1">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="10"
            value={inches}
            onChange={(e) => handleIn(e.target.value)}
            className="pr-10 rounded-xl h-11 text-sm"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
            in
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Option Constants ─────────────────────────────────────────────────────────

const GOAL_OPTS: { id: Goal; label: string }[] = [
  { id: "aesthetics", label: "Aesthetics" },
  { id: "fat_loss", label: "Fat Loss" },
  { id: "muscle_gain", label: "Muscle Gain" },
  { id: "strength", label: "Strength" },
  { id: "hybrid", label: "Hybrid" },
];
const SEX_OPTS: { id: Sex; label: string }[] = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "other", label: "Other" },
];
const LEVEL_OPTS: { id: TrainingLevel; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
  { id: "returning", label: "Returning" },
];
const DAYS_OPTS = [2, 3, 4, 5, 6, 7].map((n) => ({
  id: String(n) as `${number}`,
  label: `${n}x`,
}));
const DURATION_OPTS = [30, 45, 60, 75, 90].map((n) => ({
  id: String(n) as `${number}`,
  label: `${n} min`,
}));
const EQUIPMENT_OPTS: { id: EquipmentAccess; label: string }[] = [
  { id: "full_gym", label: "Full Gym" },
  { id: "home_gym", label: "Home Gym" },
  { id: "limited", label: "Limited" },
];
const INJURY_OPTS: { id: InjuryFlag; label: string }[] = [
  { id: "shoulders", label: "Shoulders" },
  { id: "knees", label: "Knees" },
  { id: "lower_back", label: "Lower Back" },
  { id: "wrists", label: "Wrists" },
  { id: "none", label: "None" },
];
const TRI_OPTS: { id: TriLevel; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];
const SPLIT_OPTS: { id: SplitPreference; label: string }[] = [
  { id: "ppl", label: "Push/Pull/Legs" },
  { id: "upper_lower", label: "Upper/Lower" },
  { id: "bro_split", label: "Bro Split" },
  { id: "full_body", label: "Full Body" },
  { id: "custom", label: "No preference" },
];

// ─── Main Editor ──────────────────────────────────────────────────────────────

interface EditorState {
  goal: Goal | null;
  age: number | null;
  sex: Sex | null;
  height_cm: number | null;
  weight_kg: number | null;
  training_level: TrainingLevel | null;
  workout_days_per_week: number | null;
  session_duration_minutes: number | null;
  equipment_access: EquipmentAccess | null;
  injury_flags: InjuryFlag[];
  sleep_quality: TriLevel | null;
  stress_level: TriLevel | null;
  cardio_preference: TriLevel | null;
  split_preference: SplitPreference | null;
}

function profileToState(p: Profile): EditorState {
  return {
    goal: p.goal ?? null,
    age: p.age ?? null,
    sex: p.sex ?? null,
    height_cm: p.height_cm ?? null,
    weight_kg: p.weight_kg ?? null,
    training_level: p.training_level ?? null,
    workout_days_per_week: p.workout_days_per_week ?? null,
    session_duration_minutes: p.session_duration_minutes ?? null,
    equipment_access: p.equipment_access ?? null,
    injury_flags: (p.injury_flags as InjuryFlag[]) ?? [],
    sleep_quality: p.sleep_quality ?? null,
    stress_level: p.stress_level ?? null,
    cardio_preference: p.cardio_preference ?? null,
    split_preference: p.split_preference ?? null,
  };
}

export function ProfileEditor({ profile }: { profile: Profile }) {
  const [state, setState] = useState<EditorState>(profileToState(profile));
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { system } = useUnitSystem();

  function set<K extends keyof EditorState>(key: K, val: EditorState[K]) {
    setState((prev) => ({ ...prev, [key]: val }));
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const update: ProfileUpdate = {
        ...state,
        injury_flags: state.injury_flags.length
          ? (state.injury_flags as InjuryFlag[])
          : null,
      };
      const result = await updateProfile(update);
      if (result?.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Goal */}
      <SectionCard title="Primary Goal">
        <PillSelect<Goal>
          options={GOAL_OPTS}
          value={state.goal}
          onChange={(v) => set("goal", v as Goal)}
        />
      </SectionCard>

      {/* Body Stats */}
      <SectionCard title="Body Stats">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-foreground mb-2.5 block">Sex</Label>
            <PillSelect<Sex>
              options={SEX_OPTS}
              value={state.sex}
              onChange={(v) => set("sex", v as Sex)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <NumericField
              label="Age"
              value={state.age}
              onChange={(v) => set("age", v)}
              suffix="yrs"
              placeholder="28"
            />
            {system === "imperial" ? (
              <HeightImperialField
                valueCm={state.height_cm}
                onChange={(v) => set("height_cm", v)}
              />
            ) : (
              <NumericField
                label="Height"
                value={state.height_cm}
                onChange={(v) => set("height_cm", v)}
                suffix="cm"
                placeholder="178"
              />
            )}
            {system === "imperial" ? (
              <WeightImperialField
                valueKg={state.weight_kg}
                onChange={(v) => set("weight_kg", v)}
              />
            ) : (
              <NumericField
                label="Weight"
                value={state.weight_kg}
                onChange={(v) => set("weight_kg", v)}
                suffix="kg"
                placeholder="82"
              />
            )}
          </div>
        </div>
      </SectionCard>

      {/* Training */}
      <SectionCard title="Training">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-foreground mb-2.5 block">Experience</Label>
            <PillSelect<TrainingLevel>
              options={LEVEL_OPTS}
              value={state.training_level}
              onChange={(v) => set("training_level", v as TrainingLevel)}
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-foreground mb-2.5 block">Days per week</Label>
            <PillSelect<`${number}`>
              options={DAYS_OPTS}
              value={
                state.workout_days_per_week
                  ? (String(state.workout_days_per_week) as `${number}`)
                  : null
              }
              onChange={(v) =>
                set("workout_days_per_week", parseInt(v as string, 10))
              }
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-foreground mb-2.5 block">Session duration</Label>
            <PillSelect<`${number}`>
              options={DURATION_OPTS}
              value={
                state.session_duration_minutes
                  ? (String(state.session_duration_minutes) as `${number}`)
                  : null
              }
              onChange={(v) =>
                set("session_duration_minutes", parseInt(v as string, 10))
              }
            />
          </div>
        </div>
      </SectionCard>

      {/* Equipment & Injuries */}
      <SectionCard title="Equipment & Injuries">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-foreground mb-2.5 block">Equipment access</Label>
            <PillSelect<EquipmentAccess>
              options={EQUIPMENT_OPTS}
              value={state.equipment_access}
              onChange={(v) => set("equipment_access", v as EquipmentAccess)}
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-foreground mb-2.5 block">Injuries / limitations</Label>
            <PillSelect<InjuryFlag>
              options={INJURY_OPTS}
              value={state.injury_flags}
              onChange={(v) => set("injury_flags", v as InjuryFlag[])}
              multi
            />
          </div>
        </div>
      </SectionCard>

      {/* Lifestyle */}
      <SectionCard title="Lifestyle">
        <div className="space-y-4">
          {(
            [
              { key: "sleep_quality", label: "Sleep quality" },
              { key: "stress_level", label: "Stress level" },
              { key: "cardio_preference", label: "Cardio preference" },
            ] as { key: keyof EditorState; label: string }[]
          ).map(({ key, label }) => (
            <div key={key}>
              <Label className="text-sm font-medium text-foreground mb-2.5 block">
                {label}
              </Label>
              <PillSelect<TriLevel>
                options={TRI_OPTS}
                value={state[key] as TriLevel | null}
                onChange={(v) => set(key, v as TriLevel)}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Split Preference */}
      <SectionCard title="Workout Split">
        <PillSelect<SplitPreference>
          options={SPLIT_OPTS}
          value={state.split_preference}
          onChange={(v) => set("split_preference", v as SplitPreference)}
        />
      </SectionCard>

      {/* Save */}
      <div className="pt-2 pb-4">
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 mb-3"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
        <Button
          size="lg"
          onClick={handleSave}
          disabled={isPending}
          className="w-full rounded-2xl h-12 text-base font-semibold transition-all duration-200 hover:scale-102 hover:shadow-lg active:scale-98"
        >
          {isPending ? (
            "Saving…"
          ) : saved ? (
            <span className="flex items-center gap-2">
              <Check size={16} />
              Saved
            </span>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}
