-- Invoice lifecycle: draft → issued → cancelled. Orthogonal to the existing
-- payment `status` column. Default is "issued" so existing rows (which have
-- no notion of draft) keep behaving exactly as before — only new flows that
-- deliberately create drafts will set "draft".
ALTER TABLE "invoices"
  ADD COLUMN "lifecycle_status"      VARCHAR(20) NOT NULL DEFAULT 'issued',
  ADD COLUMN "issued_at"             TIMESTAMP(3),
  ADD COLUMN "issued_by_user_id"     UUID,
  ADD COLUMN "cancelled_at"          TIMESTAMP(3),
  ADD COLUMN "cancelled_by_user_id"  UUID,
  ADD COLUMN "cancel_reason"         VARCHAR(500);

-- Existing invoices were always treated as immediately final, so backfill
-- their `issued_at` to the original creation time. Without this, queries
-- like "show invoices issued in March" would miss historical rows.
UPDATE "invoices" SET "issued_at" = "created_at" WHERE "issued_at" IS NULL;

CREATE INDEX "invoices_lifecycle_status_idx" ON "invoices"("lifecycle_status");
