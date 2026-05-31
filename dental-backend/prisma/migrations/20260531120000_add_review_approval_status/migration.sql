-- Migration: add approval_status, patient_id, source to clinic_directory_reviews
-- Changes is_visible default from true to false

-- 1. Add approval_status with default 'pending'
ALTER TABLE "clinic_directory_reviews"
  ADD COLUMN IF NOT EXISTS "approval_status" TEXT NOT NULL DEFAULT 'pending';

-- 2. Add patient_id (nullable FK to patients)
ALTER TABLE "clinic_directory_reviews"
  ADD COLUMN IF NOT EXISTS "patient_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clinic_directory_reviews_patient_id_fkey'
  ) THEN
    ALTER TABLE "clinic_directory_reviews"
      ADD CONSTRAINT "clinic_directory_reviews_patient_id_fkey"
      FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Add source column to track which event triggered the review request
ALTER TABLE "clinic_directory_reviews"
  ADD COLUMN IF NOT EXISTS "source" VARCHAR(20) NOT NULL DEFAULT 'appointment';

-- 4. Back-fill approval_status for existing rows:
--    Rows visible to the public were implicitly approved
UPDATE "clinic_directory_reviews"
  SET "approval_status" = 'approved'
  WHERE "is_visible" = true AND "token_used_at" IS NOT NULL;

--    Rows submitted by patient but not yet visible → awaiting clinic approval
UPDATE "clinic_directory_reviews"
  SET "approval_status" = 'submitted'
  WHERE "is_visible" = false AND "token_used_at" IS NOT NULL
    AND "approval_status" = 'pending';

--    Un-redeemed token rows created under the old is_visible=true default were
--    publicly counted as empty 0-star reviews. Hide them so they stop polluting
--    public aggregates/listings (and can't go public on submit without approval).
UPDATE "clinic_directory_reviews"
  SET "is_visible" = false
  WHERE "token_used_at" IS NULL AND "is_visible" = true;

-- 5. Change is_visible column default to false for new rows
ALTER TABLE "clinic_directory_reviews"
  ALTER COLUMN "is_visible" SET DEFAULT false;

-- 6. Add indexes
CREATE INDEX IF NOT EXISTS "clinic_directory_reviews_clinic_id_approval_status_idx"
  ON "clinic_directory_reviews"("clinic_id", "approval_status");

CREATE INDEX IF NOT EXISTS "clinic_directory_reviews_clinic_id_patient_id_idx"
  ON "clinic_directory_reviews"("clinic_id", "patient_id");
