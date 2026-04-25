-- Snapshot the clinical context on the prescription itself so it stays a
-- stable, printable record even if the linked ClinicalVisit is later edited.
ALTER TABLE "prescriptions"
  ADD COLUMN "chief_complaint"           TEXT,
  ADD COLUMN "past_dental_history"       TEXT,
  ADD COLUMN "allergies_medical_history" TEXT;
