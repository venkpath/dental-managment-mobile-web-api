-- Invoice-first refactor: support draft/due/overdue/cancelled statuses, hosted
-- Pay links, manual super-admin issued invoices, and paid_at tracking.
--
-- BASE TABLE — created here for fresh environments where `platform_invoices`
-- was never produced by an earlier migration (the original table was added
-- to schema.prisma without a CREATE TABLE migration ever being generated).
-- On environments where the table already exists this is a no-op.
CREATE TABLE IF NOT EXISTS "platform_invoices" (
    "id"                       UUID            NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id"                UUID            NOT NULL,
    "invoice_number"           VARCHAR(50)     NOT NULL,
    "plan_id"                  UUID,
    "plan_name"                VARCHAR(100)    NOT NULL,
    "billing_cycle"            VARCHAR(10)     NOT NULL,
    "period_start"             TIMESTAMP(3)    NOT NULL,
    "period_end"               TIMESTAMP(3)    NOT NULL,
    "subtotal"                 DECIMAL(12,2)   NOT NULL,
    "tax_rate"                 DECIMAL(5,2)    NOT NULL DEFAULT 18,
    "tax_amount"               DECIMAL(12,2)   NOT NULL,
    "total_amount"             DECIMAL(12,2)   NOT NULL,
    "currency"                 VARCHAR(10)     NOT NULL DEFAULT 'INR',
    "cgst_amount"              DECIMAL(12,2)   NOT NULL DEFAULT 0,
    "sgst_amount"              DECIMAL(12,2)   NOT NULL DEFAULT 0,
    "igst_amount"              DECIMAL(12,2)   NOT NULL DEFAULT 0,
    "bill_to_name"             VARCHAR(255)    NOT NULL,
    "bill_to_email"            VARCHAR(255)    NOT NULL,
    "bill_to_phone"            VARCHAR(50),
    "bill_to_address"          VARCHAR(500),
    "bill_to_city"             VARCHAR(100),
    "bill_to_state"            VARCHAR(100),
    "bill_to_pincode"          VARCHAR(10),
    "bill_to_gstin"            VARCHAR(20),
    "razorpay_payment_id"      VARCHAR(100),
    "razorpay_subscription_id" VARCHAR(100),
    "razorpay_payment_link_id" VARCHAR(100),
    "payment_link_url"         VARCHAR(500),
    "status"                   VARCHAR(20)     NOT NULL DEFAULT 'due',
    "pdf_s3_key"               VARCHAR(500),
    "due_date"                 TIMESTAMP(3),
    "paid_at"                  TIMESTAMP(3),
    "is_manual"                BOOLEAN         NOT NULL DEFAULT false,
    "created_by_user_id"       UUID,
    "notes"                    TEXT,
    "delivery_status"          VARCHAR(30)     NOT NULL DEFAULT 'pending',
    "whatsapp_sent_at"         TIMESTAMP(3),
    "whatsapp_error"           TEXT,
    "email_sent_at"            TIMESTAMP(3),
    "email_error"              TEXT,
    "issued_at"                TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at"               TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"               TIMESTAMP(3)    NOT NULL,
    CONSTRAINT "platform_invoices_pkey" PRIMARY KEY ("id")
);

-- Base FKs (only added when the table was just created — Postgres has no
-- "ADD CONSTRAINT IF NOT EXISTS", so we guard via the catalog).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'platform_invoices_clinic_id_fkey'
  ) THEN
    ALTER TABLE "platform_invoices"
      ADD CONSTRAINT "platform_invoices_clinic_id_fkey"
      FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'platform_invoices_plan_id_fkey'
  ) THEN
    ALTER TABLE "platform_invoices"
      ADD CONSTRAINT "platform_invoices_plan_id_fkey"
      FOREIGN KEY ("plan_id") REFERENCES "plans"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Invoice-first column additions. No-ops on a fresh table (already created
-- with these columns above); real adds on environments where the table
-- pre-existed without them.
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

-- Indexes (all idempotent).
CREATE UNIQUE INDEX IF NOT EXISTS "platform_invoices_invoice_number_key"
  ON "platform_invoices" ("invoice_number");

CREATE UNIQUE INDEX IF NOT EXISTS "platform_invoices_razorpay_payment_id_key"
  ON "platform_invoices" ("razorpay_payment_id");

CREATE UNIQUE INDEX IF NOT EXISTS "platform_invoices_razorpay_payment_link_id_key"
  ON "platform_invoices" ("razorpay_payment_link_id");

CREATE INDEX IF NOT EXISTS "platform_invoices_clinic_id_idx"
  ON "platform_invoices" ("clinic_id");

CREATE INDEX IF NOT EXISTS "platform_invoices_clinic_id_issued_at_idx"
  ON "platform_invoices" ("clinic_id", "issued_at");

CREATE INDEX IF NOT EXISTS "platform_invoices_clinic_id_status_idx"
  ON "platform_invoices" ("clinic_id", "status");

CREATE INDEX IF NOT EXISTS "platform_invoices_status_idx"
  ON "platform_invoices" ("status");

CREATE INDEX IF NOT EXISTS "platform_invoices_due_date_idx"
  ON "platform_invoices" ("due_date");

CREATE INDEX IF NOT EXISTS "platform_invoices_razorpay_subscription_id_idx"
  ON "platform_invoices" ("razorpay_subscription_id");
