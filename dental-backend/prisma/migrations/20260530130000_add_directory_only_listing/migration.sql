-- AlterTable
ALTER TABLE "clinics" ADD COLUMN "is_directory_only" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "clinics" ADD COLUMN "directory_contact_name" VARCHAR(200);
