-- Add next_billing_at to clinics for SaaS renewal-reminder cron.
-- Populated from Razorpay subscription.activated / subscription.charged
-- webhooks (current_end field). NULL until the first event lands.
ALTER TABLE "clinics" ADD COLUMN "next_billing_at" TIMESTAMP(3);
