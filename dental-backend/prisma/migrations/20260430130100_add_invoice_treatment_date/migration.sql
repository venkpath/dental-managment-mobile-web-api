-- Date the treatment/service was actually rendered. Distinct from created_at
-- so a patient treated in one month can be billed in a later month with
-- both dates printed on the invoice.
ALTER TABLE "invoices"
  ADD COLUMN "treatment_date" DATE;
