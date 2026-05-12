-- Add inactivity tracking and suspension fields to clinics
ALTER TABLE "clinics"
  ADD COLUMN "last_active_at"              TIMESTAMP(3),
  ADD COLUMN "is_suspended"               BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "suspended_at"               TIMESTAMP(3),
  ADD COLUMN "suspension_reason"          VARCHAR(255),
  ADD COLUMN "inactivity_reminder_30_sent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "inactivity_reminder_40_sent" BOOLEAN NOT NULL DEFAULT false;

-- Set last_active_at for all existing clinics to now so they are not immediately flagged
UPDATE "clinics" SET "last_active_at" = NOW() WHERE "last_active_at" IS NULL;
