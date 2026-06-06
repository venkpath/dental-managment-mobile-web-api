-- Mirror listing-form treatments on the dentist public profile
ALTER TABLE "users" ADD COLUMN "treatments_offered" JSONB;
