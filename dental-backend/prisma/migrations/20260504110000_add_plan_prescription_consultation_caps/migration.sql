-- Add per-plan monthly caps for prescriptions and consultations
ALTER TABLE "plans"
  ADD COLUMN "max_prescriptions_per_month" INTEGER,
  ADD COLUMN "max_consultations_per_month" INTEGER;

-- Add per-clinic overrides for the same resources
ALTER TABLE "clinics"
  ADD COLUMN "custom_prescription_limit" INTEGER,
  ADD COLUMN "custom_consultation_limit" INTEGER;
