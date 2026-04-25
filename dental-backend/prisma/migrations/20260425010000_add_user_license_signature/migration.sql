-- Optional doctor-specific fields used by prescription PDFs.
ALTER TABLE "users"
  ADD COLUMN "license_number" VARCHAR(100),
  ADD COLUMN "signature_url"  VARCHAR(500);
