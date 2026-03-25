-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "ai_analysis" JSONB,
ADD COLUMN     "file_name" VARCHAR(255) NOT NULL DEFAULT '',
ADD COLUMN     "mime_type" VARCHAR(100) NOT NULL DEFAULT '',
ADD COLUMN     "original_name" VARCHAR(255) NOT NULL DEFAULT '';
