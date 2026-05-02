-- Consent Forms — remote-link signing columns
-- Adds the fields the service writes to when a patient signs on their own
-- phone via a one-time WhatsApp/SMS link (token, OTP, IP/UA capture).

ALTER TABLE "patient_consents"
  ADD COLUMN IF NOT EXISTS "signed_via" VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "signing_token_hash" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "signing_token_expires_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "signing_link_sent_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "signing_link_sent_to" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "otp_code_hash" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "otp_expires_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "otp_verified_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "otp_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "signed_ip" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "signed_user_agent" VARCHAR(500);

-- Token lookup is on this column from public sign endpoints; keep it indexed
-- so the lookup stays O(log n) as volume grows.
CREATE INDEX IF NOT EXISTS "patient_consents_signing_token_hash_idx"
  ON "patient_consents"("signing_token_hash");
