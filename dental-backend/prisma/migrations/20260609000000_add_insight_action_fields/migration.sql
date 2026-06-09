-- AddColumn: recall action window fields
ALTER TABLE "patient_insight_scores" ADD COLUMN "recall_window_start" TIMESTAMP(3);
ALTER TABLE "patient_insight_scores" ADD COLUMN "recall_status" VARCHAR(20);
ALTER TABLE "patient_insight_scores" ADD COLUMN "recall_snoozed_until" TIMESTAMP(3);
ALTER TABLE "patient_insight_scores" ADD COLUMN "recall_last_contacted_at" TIMESTAMP(3);

-- AddColumn: churn action window fields
ALTER TABLE "patient_insight_scores" ADD COLUMN "churn_window_start" TIMESTAMP(3);
ALTER TABLE "patient_insight_scores" ADD COLUMN "churn_status" VARCHAR(20);
ALTER TABLE "patient_insight_scores" ADD COLUMN "churn_snoozed_until" TIMESTAMP(3);
ALTER TABLE "patient_insight_scores" ADD COLUMN "churn_last_contacted_at" TIMESTAMP(3);
ALTER TABLE "patient_insight_scores" ADD COLUMN "churn_retry_after" TIMESTAMP(3);
