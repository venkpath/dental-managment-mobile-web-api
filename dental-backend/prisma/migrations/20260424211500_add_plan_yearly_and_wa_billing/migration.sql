-- AlterTable: plans — yearly pricing + WhatsApp billing fields
ALTER TABLE "plans"
  ADD COLUMN "price_yearly" DECIMAL(10, 2),
  ADD COLUMN "razorpay_plan_id_yearly" VARCHAR(100),
  ADD COLUMN "whatsapp_included_monthly" INTEGER,
  ADD COLUMN "whatsapp_hard_limit_monthly" INTEGER,
  ADD COLUMN "allow_whatsapp_overage_billing" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: clinics — billing cycle + BYO WABA flag
ALTER TABLE "clinics"
  ADD COLUMN "billing_cycle" VARCHAR(10) NOT NULL DEFAULT 'monthly',
  ADD COLUMN "has_own_waba" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: clinic_usage_counters — per-clinic per-month messaging counters
CREATE TABLE "clinic_usage_counters" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "whatsapp_sent" INTEGER NOT NULL DEFAULT 0,
    "sms_sent" INTEGER NOT NULL DEFAULT 0,
    "email_sent" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_usage_counters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clinic_usage_counters_clinic_id_period_start_key"
  ON "clinic_usage_counters"("clinic_id", "period_start");

CREATE INDEX "clinic_usage_counters_clinic_id_idx"
  ON "clinic_usage_counters"("clinic_id");

CREATE INDEX "clinic_usage_counters_period_start_idx"
  ON "clinic_usage_counters"("period_start");

ALTER TABLE "clinic_usage_counters"
  ADD CONSTRAINT "clinic_usage_counters_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
