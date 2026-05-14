-- Platform-wide tutorial videos uploaded by super-admin to private S3.
-- Viewers are filtered by allowed_roles (lowercase role names).
CREATE TABLE IF NOT EXISTS "tutorials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "s3_key" VARCHAR(500) NOT NULL,
    "thumbnail_s3_key" VARCHAR(500),
    "duration_seconds" INTEGER,
    "category" VARCHAR(100),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "allowed_roles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tutorials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "tutorials_is_published_display_order_idx" ON "tutorials"("is_published", "display_order");
CREATE INDEX IF NOT EXISTS "tutorials_category_idx" ON "tutorials"("category");

-- Per-user watch progress. user_id is NOT FK-constrained because tutorials
-- are platform-global while users live under per-clinic isolation; deleting
-- a user simply orphans their progress rows which are pruned by no-op.
CREATE TABLE IF NOT EXISTS "tutorial_progress" (
    "tutorial_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "last_position_seconds" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tutorial_progress_pkey" PRIMARY KEY ("tutorial_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "tutorial_progress_user_id_idx" ON "tutorial_progress"("user_id");

ALTER TABLE "tutorial_progress"
  ADD CONSTRAINT "tutorial_progress_tutorial_id_fkey" FOREIGN KEY ("tutorial_id")
    REFERENCES "tutorials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
