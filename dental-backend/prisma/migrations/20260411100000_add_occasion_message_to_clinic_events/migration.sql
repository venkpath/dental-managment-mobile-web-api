-- Add occasion_message to clinic_events for national/health day custom bodies
ALTER TABLE "clinic_events" ADD COLUMN "occasion_message" TEXT;
