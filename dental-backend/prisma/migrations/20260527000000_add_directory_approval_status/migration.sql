-- Add directory listing approval workflow fields to clinics
ALTER TABLE "clinics" ADD COLUMN "directory_approval_status" VARCHAR(20) NOT NULL DEFAULT 'none';
ALTER TABLE "clinics" ADD COLUMN "directory_rejection_reason" VARCHAR(500);
ALTER TABLE "clinics" ADD COLUMN "directory_requested_at" TIMESTAMP(3);
ALTER TABLE "clinics" ADD COLUMN "directory_approved_at" TIMESTAMP(3);

-- Migrate: clinics already listed are treated as approved
UPDATE "clinics"
SET "directory_approval_status" = 'approved',
    "directory_approved_at"     = NOW()
WHERE "listed_in_directory" = true;
