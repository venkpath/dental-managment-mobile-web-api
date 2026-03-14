-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "template_id" UUID,
    "segment_type" VARCHAR(30) NOT NULL,
    "segment_config" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "total_recipients" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "delivered_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "read_count" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost" DECIMAL(10,2),
    "actual_cost" DECIMAL(10,2),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "rule_type" VARCHAR(50) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "channel" VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
    "template_id" UUID,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_events" (
    "id" UUID NOT NULL,
    "clinic_id" UUID,
    "event_name" VARCHAR(255) NOT NULL,
    "event_date" DATE NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT true,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "template_id" UUID,
    "send_offer" BOOLEAN NOT NULL DEFAULT false,
    "offer_details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_feedback" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "appointment_id" UUID,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "google_review_requested" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_referral_codes" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "referrer_patient_id" UUID NOT NULL,
    "referred_patient_id" UUID,
    "referral_code_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "reward_type" VARCHAR(30),
    "reward_value" DECIMAL(10,2),
    "reward_status" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaigns_clinic_id_idx" ON "campaigns"("clinic_id");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "campaigns_scheduled_at_idx" ON "campaigns"("scheduled_at");

-- CreateIndex
CREATE INDEX "campaigns_clinic_id_status_idx" ON "campaigns"("clinic_id", "status");

-- CreateIndex
CREATE INDEX "automation_rules_clinic_id_idx" ON "automation_rules"("clinic_id");

-- CreateIndex
CREATE INDEX "automation_rules_rule_type_idx" ON "automation_rules"("rule_type");

-- CreateIndex
CREATE UNIQUE INDEX "automation_rules_clinic_id_rule_type_key" ON "automation_rules"("clinic_id", "rule_type");

-- CreateIndex
CREATE INDEX "clinic_events_clinic_id_idx" ON "clinic_events"("clinic_id");

-- CreateIndex
CREATE INDEX "clinic_events_event_date_idx" ON "clinic_events"("event_date");

-- CreateIndex
CREATE INDEX "patient_feedback_clinic_id_idx" ON "patient_feedback"("clinic_id");

-- CreateIndex
CREATE INDEX "patient_feedback_patient_id_idx" ON "patient_feedback"("patient_id");

-- CreateIndex
CREATE INDEX "patient_feedback_appointment_id_idx" ON "patient_feedback"("appointment_id");

-- CreateIndex
CREATE INDEX "patient_feedback_rating_idx" ON "patient_feedback"("rating");

-- CreateIndex
CREATE INDEX "patient_referral_codes_patient_id_idx" ON "patient_referral_codes"("patient_id");

-- CreateIndex
CREATE INDEX "patient_referral_codes_clinic_id_idx" ON "patient_referral_codes"("clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_referral_codes_clinic_id_code_key" ON "patient_referral_codes"("clinic_id", "code");

-- CreateIndex
CREATE INDEX "referrals_clinic_id_idx" ON "referrals"("clinic_id");

-- CreateIndex
CREATE INDEX "referrals_referrer_patient_id_idx" ON "referrals"("referrer_patient_id");

-- CreateIndex
CREATE INDEX "referrals_referred_patient_id_idx" ON "referrals"("referred_patient_id");

-- CreateIndex
CREATE INDEX "referrals_referral_code_id_idx" ON "referrals"("referral_code_id");

-- CreateIndex
CREATE INDEX "referrals_status_idx" ON "referrals"("status");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_events" ADD CONSTRAINT "clinic_events_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_events" ADD CONSTRAINT "clinic_events_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_feedback" ADD CONSTRAINT "patient_feedback_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_feedback" ADD CONSTRAINT "patient_feedback_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_referral_codes" ADD CONSTRAINT "patient_referral_codes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_referral_codes" ADD CONSTRAINT "patient_referral_codes_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_patient_id_fkey" FOREIGN KEY ("referrer_patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_patient_id_fkey" FOREIGN KEY ("referred_patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referral_code_id_fkey" FOREIGN KEY ("referral_code_id") REFERENCES "patient_referral_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
