-- AddColumn: no-show attendance attribution
-- Stamped when a high/medium risk patient actually checks in or completes their appointment,
-- proving they showed up. Enables realized-revenue tracking for the no-show bucket.

ALTER TABLE "patient_insight_scores"
  ADD COLUMN "no_show_attended_at"             TIMESTAMP(3),
  ADD COLUMN "no_show_attended_appointment_id" UUID;
