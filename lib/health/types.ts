/**
 * Health and wearable metric types
 */

export interface NormalizedHealthMetrics {
  sleep_duration?: number;        // hours
  sleep_quality?: number;         // 0–100
  hrv?: number;                   // ms
  resting_heart_rate?: number;    // bpm
  stress_score?: number;          // 0–100
  daily_steps?: number;           // count
  active_calories?: number;       // kcal
  activity_level?: number;        // 0–100 (normalized activity intensity)
  vo2_max?: number;               // ml/kg/min (aerobic capacity)
  training_load?: number;         // 1–100 (current training stress)
  recovery_status?: string;       // low | moderate | high
}

export interface WearableHealthSnapshot {
  user_id: string;
  metric_date: string;            // YYYY-MM-DD
  provider: string;
  metrics: NormalizedHealthMetrics;
  sync_timestamp: string;         // ISO timestamp of sync
  data_completeness: number;      // 0–1, fraction of expected metrics present
  quality_score: number;          // 0–100, data freshness and consistency
}

export interface SyncResult {
  provider: string;
  user_id: string;
  started_at: string;
  completed_at?: string;
  status: "in_progress" | "completed" | "failed" | "partial";
  records_processed: number;
  error?: string;
}

export type HealthMetricKey = keyof NormalizedHealthMetrics;

export interface ConfidenceModifiers {
  wearable_data_available: boolean;
  data_completeness: number;      // 0–1
  data_freshness: number;         // 0–1 (1 = synced today)
  provider_reliability: number;   // 0–1
  metric_quality_score: number;   // 0–1
}

export interface RecoveryConfidenceContext {
  has_manual_sleep: boolean;
  has_wearable_sleep: boolean;
  has_hrv_data: boolean;
  has_resting_hr: boolean;
  confidence_multiplier: number;  // applies to readiness score
  data_source_description: string;
}
