-- Extend the per-clinic customisation surface so a single clinic can run
-- "Starter + extras" without a one-off Plan row:
--   1. Numeric structural caps (max_branches, max_staff) join the existing
--      custom_*_limit pattern as nullable columns on clinics.
--   2. ClinicFeatureOverride gains audit fields so support can answer
--      "why does this clinic have feature X?" without git-blame.

-- 1) Structural cap overrides on clinics
ALTER TABLE "clinics"
  ADD COLUMN "custom_max_branches" INTEGER NULL,
  ADD COLUMN "custom_max_staff"    INTEGER NULL;

-- 2) Audit fields on clinic_feature_overrides
ALTER TABLE "clinic_feature_overrides"
  ADD COLUMN "reason"                    VARCHAR(500) NULL,
  ADD COLUMN "granted_by_super_admin_id" UUID         NULL,
  ADD COLUMN "expires_at"                TIMESTAMP(3) NULL;

ALTER TABLE "clinic_feature_overrides"
  ADD CONSTRAINT "clinic_feature_overrides_granted_by_super_admin_id_fkey"
  FOREIGN KEY ("granted_by_super_admin_id") REFERENCES "super_admins" ("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "clinic_feature_overrides_expires_at_idx"
  ON "clinic_feature_overrides" ("expires_at");
