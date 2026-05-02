-- Refunds against patient invoices. Modeled as a separate table (rather
-- than negative payment rows) so the original Payment records stay
-- immutable for audit. A refund may optionally link to the specific
-- payment it reverses; when null, it's a generic credit against the
-- invoice. Net amount paid by the patient = sum(payments) - sum(refunds).
CREATE TABLE "refunds" (
  "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
  "clinic_id"           UUID NOT NULL,
  "invoice_id"          UUID NOT NULL,
  "payment_id"          UUID,
  "amount"              DECIMAL(10, 2) NOT NULL,
  "method"              VARCHAR(20) NOT NULL,
  "reason"              VARCHAR(500),
  "refunded_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "refunded_by_user_id" UUID,

  CONSTRAINT "refunds_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "refunds_invoice_id_fkey"
    FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "refunds_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payments"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "refunds_refunded_by_user_id_fkey"
    FOREIGN KEY ("refunded_by_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "refunds_clinic_id_idx"           ON "refunds"("clinic_id");
CREATE INDEX "refunds_invoice_id_idx"          ON "refunds"("invoice_id");
CREATE INDEX "refunds_payment_id_idx"          ON "refunds"("payment_id");
CREATE INDEX "refunds_refunded_by_user_id_idx" ON "refunds"("refunded_by_user_id");
