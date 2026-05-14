-- Stage 5: Add nutrition recovery modifier to systemic_recovery table
-- This column stores the recovery modifier calculated from weekly nutrition adherence
-- Range: -10 (poor nutrition) to +5 (excellent nutrition)

ALTER TABLE systemic_recovery
ADD COLUMN IF NOT EXISTS nutrient_modifier NUMERIC(4,2) NOT NULL DEFAULT 0;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_systemic_recovery_nutrient_modifier ON systemic_recovery(nutrient_modifier);

-- Comment for clarity
COMMENT ON COLUMN systemic_recovery.nutrient_modifier IS 'Recovery modifier from nutrition adherence: -10 (under-eating) to +5 (excellent nutrition)';
