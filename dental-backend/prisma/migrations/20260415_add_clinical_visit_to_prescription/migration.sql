-- Add clinical_visit_id column to prescriptions table
ALTER TABLE "prescriptions" ADD COLUMN "clinical_visit_id" UUID;

-- Add foreign key constraint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_clinical_visit_id_fkey" FOREIGN KEY ("clinical_visit_id") REFERENCES "clinical_visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for performance
CREATE INDEX "prescriptions_clinical_visit_id_idx" ON "prescriptions"("clinical_visit_id");
