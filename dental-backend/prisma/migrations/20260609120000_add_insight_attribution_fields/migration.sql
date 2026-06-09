-- Booking attribution: patient booked within outreach window after staff/campaign contact
ALTER TABLE "patient_insight_scores" ADD COLUMN "recall_booked_after_outreach_at" TIMESTAMP(3);
ALTER TABLE "patient_insight_scores" ADD COLUMN "recall_booked_appointment_id" UUID;
ALTER TABLE "patient_insight_scores" ADD COLUMN "churn_booked_after_outreach_at" TIMESTAMP(3);
ALTER TABLE "patient_insight_scores" ADD COLUMN "churn_booked_appointment_id" UUID;
