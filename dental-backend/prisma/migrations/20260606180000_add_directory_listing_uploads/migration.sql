CREATE TABLE IF NOT EXISTS "directory_listing_uploads" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "s3_key" VARCHAR(500) NOT NULL,
  "document_type" VARCHAR(30) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "claimed_at" TIMESTAMP(3),
  "clinic_id" UUID,
  CONSTRAINT "directory_listing_uploads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "directory_listing_uploads_s3_key_key"
  ON "directory_listing_uploads" ("s3_key");

CREATE INDEX IF NOT EXISTS "directory_listing_uploads_claimed_at_created_at_idx"
  ON "directory_listing_uploads" ("claimed_at", "created_at");

ALTER TABLE "directory_listing_uploads"
  ADD CONSTRAINT "directory_listing_uploads_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
