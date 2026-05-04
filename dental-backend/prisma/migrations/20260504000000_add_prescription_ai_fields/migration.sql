-- Add AI-generated safety fields to prescriptions table
ALTER TABLE "prescriptions"
  ADD COLUMN IF NOT EXISTS "interactions"                TEXT,
  ADD COLUMN IF NOT EXISTS "dietary_advice"              TEXT,
  ADD COLUMN IF NOT EXISTS "post_procedure_instructions" TEXT,
  ADD COLUMN IF NOT EXISTS "follow_up"                   TEXT;

-- Add AI-generated per-medicine context and inventory linkage to prescription_items
ALTER TABLE "prescription_items"
  ADD COLUMN IF NOT EXISTS "route"         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "purpose"       VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "warnings"      TEXT,
  ADD COLUMN IF NOT EXISTS "inventory_id"  UUID;
