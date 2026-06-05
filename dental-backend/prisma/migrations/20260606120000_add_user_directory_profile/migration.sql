-- Public doctor profile fields on users (used by staff settings + /find-dentist directory).
-- IF NOT EXISTS: safe when columns were already added via prisma db push on dev.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "years_experience" INTEGER;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "education" JSONB;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "specializations" JSONB;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "languages_spoken" VARCHAR(200);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "consultation_fee" DECIMAL(10, 2);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "listed_in_directory" BOOLEAN NOT NULL DEFAULT false;
