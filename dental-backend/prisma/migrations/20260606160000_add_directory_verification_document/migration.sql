ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "directory_verification_document_url" VARCHAR(500);
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "directory_verification_document_type" VARCHAR(30);
