-- Manual migration: per-user optional feature grants
-- Run this against your database if prisma migrate dev is unavailable:
--   psql $DATABASE_URL -f prisma/migrations/manual_user_feature_access.sql

CREATE TABLE IF NOT EXISTS "user_feature_access" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id"     UUID NOT NULL,
  "feature_key" VARCHAR(100) NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_feature_access_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_feature_access_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_feature_access_user_id_feature_key_key"
  ON "user_feature_access"("user_id", "feature_key");

CREATE INDEX IF NOT EXISTS "user_feature_access_user_id_idx"
  ON "user_feature_access"("user_id");
