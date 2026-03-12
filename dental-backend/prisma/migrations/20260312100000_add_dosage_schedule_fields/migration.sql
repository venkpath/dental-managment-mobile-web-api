-- AlterTable
ALTER TABLE "prescription_items" ADD COLUMN "morning" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "prescription_items" ADD COLUMN "afternoon" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "prescription_items" ADD COLUMN "evening" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "prescription_items" ADD COLUMN "night" INTEGER NOT NULL DEFAULT 0;
