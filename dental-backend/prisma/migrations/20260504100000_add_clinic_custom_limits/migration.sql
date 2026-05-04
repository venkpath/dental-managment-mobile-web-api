-- Add per-clinic monthly usage limit overrides (null = use plan default)
ALTER TABLE "clinics"
  ADD COLUMN "custom_patient_limit"     INTEGER,
  ADD COLUMN "custom_appointment_limit" INTEGER,
  ADD COLUMN "custom_invoice_limit"     INTEGER,
  ADD COLUMN "custom_treatment_limit"   INTEGER;
