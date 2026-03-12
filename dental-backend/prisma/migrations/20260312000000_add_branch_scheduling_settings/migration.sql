-- AlterTable: Add configurable scheduling settings to branches
ALTER TABLE "branches" ADD COLUMN "working_start_time" VARCHAR(5);
ALTER TABLE "branches" ADD COLUMN "working_end_time" VARCHAR(5);
ALTER TABLE "branches" ADD COLUMN "lunch_start_time" VARCHAR(5);
ALTER TABLE "branches" ADD COLUMN "lunch_end_time" VARCHAR(5);
ALTER TABLE "branches" ADD COLUMN "slot_duration" INTEGER DEFAULT 15;
ALTER TABLE "branches" ADD COLUMN "default_appt_duration" INTEGER DEFAULT 30;
ALTER TABLE "branches" ADD COLUMN "buffer_minutes" INTEGER DEFAULT 0;
ALTER TABLE "branches" ADD COLUMN "advance_booking_days" INTEGER DEFAULT 30;
ALTER TABLE "branches" ADD COLUMN "working_days" VARCHAR(20);
