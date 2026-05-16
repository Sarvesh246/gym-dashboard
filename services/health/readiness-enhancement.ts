/**
 * Readiness enhancement with wearable data
 * Wraps deterministic readiness scoring with wearable confidence modifiers
 */

import type { ReadinessInput, ReadinessOutput } from "@/lib/recovery/types";
import { calculateReadiness } from "@/lib/recovery/scoring";
import { buildRecoveryContextWithWearables } from "./recovery-enhancement";
import { applyWearableReadinessAdjustment } from "./recovery-enhancement";
import type { RecoveryConfidenceContext } from "@/lib/health/types";

export interface EnhancedReadinessOutput extends ReadinessOutput {
  confidence_context: RecoveryConfidenceContext;
  wearable_adjusted_score?: number;
  base_score: number;
  confidence_multiplier: number;
}

/**
 * Calculate readiness with optional wearable enhancement
 * If wearable data is available, applies confidence modifiers
 * Otherwise, returns standard readiness score
 */
export async function calculateEnhancedReadiness(
  userId: string,
  input: ReadinessInput,
  hasManualSleep: boolean = false
): Promise<EnhancedReadinessOutput> {
  // Calculate base readiness (deterministic, no wearables)
  const base = calculateReadiness(input);

  // Build recovery context with wearable data
  const confidenceContext = await buildRecoveryContextWithWearables(userId, hasManualSleep);

  // Apply wearable adjustments if available
  let wearableAdjustedScore = base.readiness_score;
  if (confidenceContext.has_wearable_sleep || confidenceContext.has_hrv_data) {
    wearableAdjustedScore = applyWearableReadinessAdjustment(
      base.readiness_score,
      confidenceContext
    );
  }

  // Update tier if score changed significantly
  let finalScore = base.readiness_score;
  let finalTier = base.tier;

  // Only apply adjustment if it's a material change and high confidence
  if (
    confidenceContext.has_wearable_sleep &&
    Math.abs(wearableAdjustedScore - base.readiness_score) >= 2
  ) {
    finalScore = wearableAdjustedScore;
    finalTier = calculateRecoveryTier(wearableAdjustedScore);
  }

  return {
    ...base,
    readiness_score: finalScore,
    tier: finalTier,
    confidence_context: confidenceContext,
    wearable_adjusted_score: wearableAdjustedScore,
    base_score: base.readiness_score,
    confidence_multiplier: confidenceContext.confidence_multiplier,
  };
}

/**
 * Re-classify recovery tier based on new score
 */
function calculateRecoveryTier(score: number) {
  const s = Math.max(0, Math.min(100, score));
  if (s >= 75) return "green";
  if (s >= 50) return "yellow";
  if (s >= 25) return "orange";
  return "red";
}

/**
 * Get readiness explanation with wearable context
 */
export function getEnhancedReadinessExplanation(output: EnhancedReadinessOutput): string {
  const { readiness_score, base_score, confidence_context } = output;

  let explanation = `Recovery readiness: ${Math.round(readiness_score)}%`;

  if (confidence_context.has_wearable_sleep) {
    const adjustment = readiness_score - base_score;
    if (adjustment > 2) {
      explanation += " (wearable data shows positive recovery signals)";
    } else if (adjustment < -2) {
      explanation += " (wearable data indicates elevated stress)";
    }
  }

  explanation += ` · ${confidence_context.data_source_description}`;

  return explanation;
}

/**
 * Determine confidence level for readiness score
 */
export function getReadinessConfidenceLevel(
  context: RecoveryConfidenceContext
): "low" | "medium" | "high" {
  if (!context.has_manual_sleep && !context.has_wearable_sleep) {
    return "low";
  }

  if (context.has_wearable_sleep && context.has_hrv_data && context.has_resting_hr) {
    return "high";
  }

  if (context.has_wearable_sleep && context.has_manual_sleep) {
    return "high";
  }

  return "medium";
}
