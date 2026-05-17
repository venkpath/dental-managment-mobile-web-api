-- Per-clinic feature overrides. Row exists only when super admin has
-- explicitly customised a feature for a clinic. Missing row => fall back
-- to the plan's PlanFeature default. is_enabled=true grants on top of
-- plan, is_enabled=false revokes a plan-included feature.
CREATE TABLE "clinic_feature_overrides" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "clinic_id"  UUID         NOT NULL,
  "feature_id" UUID         NOT NULL,
  "is_enabled" BOOLEAN      NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "clinic_feature_overrides_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clinic_feature_overrides_clinic_id_feature_id_key"
  ON "clinic_feature_overrides" ("clinic_id", "feature_id");

CREATE INDEX "clinic_feature_overrides_clinic_id_idx"
  ON "clinic_feature_overrides" ("clinic_id");

CREATE INDEX "clinic_feature_overrides_feature_id_idx"
  ON "clinic_feature_overrides" ("feature_id");

ALTER TABLE "clinic_feature_overrides"
  ADD CONSTRAINT "clinic_feature_overrides_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "clinic_feature_overrides"
  ADD CONSTRAINT "clinic_feature_overrides_feature_id_fkey"
  FOREIGN KEY ("feature_id") REFERENCES "features" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
