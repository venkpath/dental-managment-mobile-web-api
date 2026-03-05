-- AlterTable: Add new fields to clinics
ALTER TABLE "clinics" ADD COLUMN "email" VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE "clinics" ADD COLUMN "phone" VARCHAR(50);
ALTER TABLE "clinics" ADD COLUMN "address" VARCHAR(500);
ALTER TABLE "clinics" ADD COLUMN "city" VARCHAR(100);
ALTER TABLE "clinics" ADD COLUMN "state" VARCHAR(100);
ALTER TABLE "clinics" ADD COLUMN "country" VARCHAR(100);

-- Remove default after backfill
ALTER TABLE "clinics" ALTER COLUMN "email" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "clinics_email_idx" ON "clinics"("email");
