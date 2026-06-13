-- Add booking short code for WhatsApp booking links
ALTER TABLE "branches" ADD COLUMN "booking_short_code" VARCHAR(10);

-- Backfill existing branches using first 8 chars of md5(id) — deterministic and unique per branch
UPDATE "branches" SET "booking_short_code" = substring(md5(id::text), 1, 8) WHERE "booking_short_code" IS NULL;

-- Unique index
CREATE UNIQUE INDEX "branches_booking_short_code_key" ON "branches"("booking_short_code");
