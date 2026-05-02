-- Add profile_photo_url to users and patients (S3 key for private profile photo)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_photo_url" VARCHAR(500);
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "profile_photo_url" VARCHAR(500);
