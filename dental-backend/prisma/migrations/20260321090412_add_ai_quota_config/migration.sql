-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "ai_quota_override" INTEGER;

-- CreateTable
CREATE TABLE "global_settings" (
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_settings_pkey" PRIMARY KEY ("key")
);
