-- AlterTable: add monthly caps on Plan (null = unlimited)
ALTER TABLE "plans"
  ADD COLUMN "max_patients_per_month"     INTEGER,
  ADD COLUMN "max_appointments_per_month" INTEGER;
