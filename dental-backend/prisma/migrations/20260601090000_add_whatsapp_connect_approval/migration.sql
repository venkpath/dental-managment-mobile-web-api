-- Migration: gate BYO-WABA self-connect behind super-admin approval
-- Clinics can no longer connect their own WhatsApp Business Account via
-- Embedded Signup until a super-admin verifies the business and enables it.

ALTER TABLE "clinics"
  ADD COLUMN IF NOT EXISTS "whatsapp_connect_approved" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "clinics"
  ADD COLUMN IF NOT EXISTS "whatsapp_connect_requested_at" TIMESTAMP(3);

ALTER TABLE "clinics"
  ADD COLUMN IF NOT EXISTS "whatsapp_connect_approved_at" TIMESTAMP(3);

-- Back-fill: clinics already running on their own WABA were implicitly approved,
-- so existing connections keep working.
UPDATE "clinics"
  SET "whatsapp_connect_approved" = true,
      "whatsapp_connect_approved_at" = COALESCE("whatsapp_connect_approved_at", now())
  WHERE "has_own_waba" = true;
