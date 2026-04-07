-- AlterTable
ALTER TABLE "users" ADD COLUMN "phone" VARCHAR(20),
ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "phone_verified" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: Mark existing active users as email-verified
UPDATE "users" SET "email_verified" = true WHERE "status" = 'active';
