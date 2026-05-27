-- All ADD COLUMN statements use IF NOT EXISTS to handle environments where db push was used
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "listed_in_directory" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "directory_approval_status" VARCHAR(20) NOT NULL DEFAULT 'none';
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "directory_rejection_reason" VARCHAR(500);
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "directory_requested_at" TIMESTAMP(3);
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "directory_approved_at" TIMESTAMP(3);

-- Migrate: clinics already listed are treated as approved
UPDATE "clinics"
SET "directory_approval_status" = 'approved',
    "directory_approved_at"     = NOW()
WHERE "listed_in_directory" = true;
