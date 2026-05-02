-- Track which user created each invoice. Used to print the generator's name
-- and signature on the invoice PDF. Nullable so existing rows keep working;
-- ON DELETE SET NULL so removing a staff account does not cascade-delete
-- their historical invoices.
ALTER TABLE "invoices"
  ADD COLUMN "created_by_user_id" UUID;

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "invoices_created_by_user_id_idx" ON "invoices"("created_by_user_id");
