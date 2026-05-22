-- WhatsApp overage billing infrastructure.
--
-- Plans include a base monthly WhatsApp message quota (Plan.whatsapp_included_monthly).
-- When a clinic on Standard/Growth sends MORE than the included quota in a billing
-- period, we bill the extras at per-category rates:
--   UTILITY        → ₹0.40 / msg
--   MARKETING      → ₹1.00 / msg
--   AUTHENTICATION → ₹0.30 / msg
-- (See dental-backend/src/modules/communication/whatsapp-pricing.constants.ts)
--
-- This migration adds:
--   1) Per-category send counters on the monthly clinic usage row
--   2) Meta WA category (UTILITY/MARKETING/AUTHENTICATION) on each communication_message
--      for audit + recompute
--   3) `invoice_type` discriminator + structured `line_items` JSON on platform_invoices
--      so an overage invoice can carry "142 utility msgs × ₹0.40 = ₹56.80" rows.

-- ─── 1. Category-split WhatsApp counters ───
ALTER TABLE "clinic_usage_counters"
  ADD COLUMN "whatsapp_utility_sent"        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "whatsapp_marketing_sent"      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "whatsapp_authentication_sent" INTEGER NOT NULL DEFAULT 0;

-- Backfill: assume historical messages were UTILITY (safest — lowest price, doesn't
-- overcharge anyone). Going forward, we'll track the actual category per message.
UPDATE "clinic_usage_counters"
SET "whatsapp_utility_sent" = "whatsapp_sent";

-- ─── 2. Meta category on each message (for audit + recompute) ───
ALTER TABLE "communication_messages"
  ADD COLUMN "wa_category" VARCHAR(20);

CREATE INDEX "communication_messages_wa_category_idx"
  ON "communication_messages" ("wa_category");

-- ─── 3. Invoice type + structured line items ───
ALTER TABLE "platform_invoices"
  ADD COLUMN "invoice_type" VARCHAR(30) NOT NULL DEFAULT 'subscription',
  ADD COLUMN "line_items"   JSONB;

CREATE INDEX "platform_invoices_invoice_type_idx"
  ON "platform_invoices" ("invoice_type");
