-- Invoice-first refactor: support draft/due/overdue/cancelled statuses, hosted
-- Pay links, manual super-admin issued invoices, and paid_at tracking.

ALTER TABLE "platform_invoices"
  ADD COLUMN IF NOT EXISTS "razorpay_payment_link_id" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "payment_link_url"        VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "due_date"                TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "paid_at"                 TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "is_manual"               BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "created_by_user_id"      UUID,
  ADD COLUMN IF NOT EXISTS "notes"                   TEXT;

-- Default for `status` was previously 'paid' (charge-time invoices). New
-- manually-created or pre-generated invoices land as 'due' instead. Existing
-- rows are unaffected.
ALTER TABLE "platform_invoices" ALTER COLUMN "status" SET DEFAULT 'due';

-- Backfill paid_at for legacy paid rows so the UI doesn't show null payment
-- timestamps on historical invoices.
UPDATE "platform_invoices"
SET "paid_at" = "issued_at"
WHERE "status" = 'paid' AND "paid_at" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "platform_invoices_razorpay_payment_link_id_key"
  ON "platform_invoices" ("razorpay_payment_link_id");

CREATE INDEX IF NOT EXISTS "platform_invoices_clinic_id_status_idx"
  ON "platform_invoices" ("clinic_id", "status");

CREATE INDEX IF NOT EXISTS "platform_invoices_due_date_idx"
  ON "platform_invoices" ("due_date");
