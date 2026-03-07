-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "ai_usage_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "plan_id" UUID,
ADD COLUMN     "subscription_status" VARCHAR(20) NOT NULL DEFAULT 'trial',
ADD COLUMN     "trial_ends_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "clinics_plan_id_idx" ON "clinics"("plan_id");

-- AddForeignKey
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
