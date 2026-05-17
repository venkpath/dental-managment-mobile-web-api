-- Per-clinic locked discount price. When custom_price_* is set and not yet
-- expired, the invoice cron bills that amount instead of the plan default.
-- Auto-reverts on custom_price_expires_at. Reason + granted_by are recorded
-- so revenue audits can trace why a clinic pays less than their plan price.
ALTER TABLE "clinics"
  ADD COLUMN "custom_price_monthly"                   DECIMAL(10, 2) NULL,
  ADD COLUMN "custom_price_yearly"                    DECIMAL(10, 2) NULL,
  ADD COLUMN "custom_price_expires_at"                TIMESTAMP(3)   NULL,
  ADD COLUMN "custom_price_reason"                    VARCHAR(500)   NULL,
  ADD COLUMN "custom_price_granted_by_super_admin_id" UUID           NULL;

ALTER TABLE "clinics"
  ADD CONSTRAINT "clinics_custom_price_granted_by_super_admin_id_fkey"
  FOREIGN KEY ("custom_price_granted_by_super_admin_id") REFERENCES "super_admins" ("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- The renewal/trial-end cron filters on next_billing_at + custom_price_expires_at,
-- so an index on the expiry helps cheap "purge expired discounts" sweeps.
CREATE INDEX "clinics_custom_price_expires_at_idx"
  ON "clinics" ("custom_price_expires_at");
