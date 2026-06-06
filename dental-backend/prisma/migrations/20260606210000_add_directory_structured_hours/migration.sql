-- AlterTable: add structured working-hours, photos, and dentist staging fields to directory listings
ALTER TABLE "clinics"
  ADD COLUMN "directory_working_days"             VARCHAR(20),
  ADD COLUMN "directory_working_start_time"       VARCHAR(5),
  ADD COLUMN "directory_working_end_time"         VARCHAR(5),
  ADD COLUMN "directory_dentist_photo_url"        VARCHAR(500),
  ADD COLUMN "directory_clinic_image_url"         VARCHAR(500),
  ADD COLUMN "directory_dentist_years_experience" INTEGER;
