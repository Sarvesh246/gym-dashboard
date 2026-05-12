import type { BodyMapData, MuscleGroup, RecoveryTier } from "@/lib/recovery/types";
import { RECOVERY_TIER_THRESHOLDS } from "@/lib/recovery/constants";
import { MUSCLE_LABELS, BODY_MAP_MUSCLES } from "@/lib/muscles/mapping";
import { SectionCard } from "@/components/ui/SectionCard";

interface MuscleStateGridProps {
  bodyMap: BodyMapData;
}

const TIER_BAR_COLOR: Record<RecoveryTier, string> = {
  green:  "#22C55E",
  yellow: "#F59E0B",
  orange: "#F97316",
  red:    "#EF4444",
};

// SVG zones for the body figure (same shapes as dashboard)
const ZONE_SHAPES: Partial<Record<MuscleGroup, React.ReactNode>> = {
  front_delts: (
    <>
      <rect x="9"  y="25" width="20" height="44" rx="10" />
      <rect x="71" y="25" width="20" height="44" rx="10" />
    </>
  ),
  chest: <rect x="29" y="25" width="42" height="44" rx="12" />,
  biceps: (
    <>
      <rect x="7"  y="70" width="18" height="32" rx="9" />
      <rect x="75" y="70" width="18" height="32" rx="9" />
    </>
  ),
  core:   <rect x="29" y="70" width="42" height="36" rx="10" />,
  quads: (
    <>
      <rect x="29" y="104" width="42" height="10" rx="6" />
      <rect x="30" y="110" width="19" height="46" rx="10" />
      <rect x="51" y="110" width="19" height="46" rx="10" />
    </>
  ),
  calves: (
    <>
      <rect x="31" y="157" width="17" height="38" rx="9" />
      <rect x="52" y="157" width="17" height="38" rx="9" />
    </>
  ),
};

// Muscles shown in the SVG (subset with clear shapes)
const SVG_MUSCLES: MuscleGroup[] = ["chest", "front_delts", "biceps", "core", "quads", "calves"];

export function MuscleStateGrid({ bodyMap }: MuscleStateGridProps) {
  const getTierColor = (muscle: MuscleGroup) => {
    const tier = bodyMap[muscle]?.tier ?? "green";
    return TIER_BAR_COLOR[tier];
  };

  const getFill = (muscle: MuscleGroup) => {
    const color = getTierColor(muscle);
    return color + "26"; // ~15% opacity
  };

  const getScore = (muscle: MuscleGroup) =>
    Math.round(bodyMap[muscle]?.recovery_score ?? 100);

  return (
    <SectionCard title="Muscle Recovery Map" subtitle="Time-projected recovery scores">
      <div className="flex flex-col gap-4 py-1">
        <div className="flex items-start gap-5">
          {/* SVG body figure */}
          <div className="w-36 h-64 shrink-0">
            <svg viewBox="0 0 100 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              {/* Head */}
              <circle
                cx="50" cy="11" r="10"
                fill="var(--foreground)" fillOpacity="0.08"
                stroke="var(--foreground)" strokeOpacity="0.2" strokeWidth="0.8"
              />
              <rect x="45" y="20" width="10" height="8" rx="4" fill="var(--foreground)" fillOpacity="0.08" />
              {/* Coloured zones */}
              {SVG_MUSCLES.map((muscle) => {
                const shape = ZONE_SHAPES[muscle];
                if (!shape) return null;
                const color = getTierColor(muscle);
                return (
                  <g key={muscle} fill={getFill(muscle)} stroke={color} strokeWidth="0.9">
                    {shape}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Score bars */}
          <div className="flex-1 flex flex-col gap-2 pt-1">
            {BODY_MAP_MUSCLES.map((muscle) => {
              const score = getScore(muscle);
              const color = getTierColor(muscle);
              const tier  = bodyMap[muscle]?.tier ?? "green";
              const label = RECOVERY_TIER_THRESHOLDS[tier].label;
              return (
                <div key={muscle} className="flex items-center gap-2">
                  <span className="text-xs text-foreground/80 w-[76px] shrink-0">
                    {MUSCLE_LABELS[muscle]}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${score}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-foreground w-6 text-right">
                    {score}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tier legend */}
        <div className="flex items-center gap-5 pt-3 border-t border-border flex-wrap">
          {(["green", "yellow", "orange", "red"] as RecoveryTier[]).map((tier) => (
            <div key={tier} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: TIER_BAR_COLOR[tier] }}
              />
              <span className="text-xs text-muted-foreground">
                {RECOVERY_TIER_THRESHOLDS[tier].label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
