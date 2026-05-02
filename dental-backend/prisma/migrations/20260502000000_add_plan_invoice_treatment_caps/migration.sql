-- AlterTable: add monthly invoice/treatment caps on Plan (null = unlimited)
ALTER TABLE "plans"
  ADD COLUMN "max_invoices_per_month"   INTEGER,
  ADD COLUMN "max_treatments_per_month" INTEGER;

-- Backfill caps for the Free plan so existing rows match the seeded defaults.
UPDATE "plans"
SET
  "max_invoices_per_month"   = 20,
  "max_treatments_per_month" = 20
WHERE LOWER("name") = 'free';
