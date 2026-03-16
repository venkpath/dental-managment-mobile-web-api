-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "subscription_id" VARCHAR(100);

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "razorpay_plan_id" VARCHAR(100);
