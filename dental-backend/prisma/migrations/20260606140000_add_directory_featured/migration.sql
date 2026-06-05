ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "directory_featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "directory_featured_order" INTEGER;

CREATE INDEX IF NOT EXISTS "clinics_directory_featured_directory_featured_order_idx"
  ON "clinics" ("directory_featured", "directory_featured_order");
