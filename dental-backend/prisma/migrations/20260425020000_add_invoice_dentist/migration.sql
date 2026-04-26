-- Add optional dentist (User) FK to invoices
ALTER TABLE "invoices" ADD COLUMN "dentist_id" UUID;

CREATE INDEX "invoices_dentist_id_idx" ON "invoices"("dentist_id");

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_dentist_id_fkey"
  FOREIGN KEY ("dentist_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
