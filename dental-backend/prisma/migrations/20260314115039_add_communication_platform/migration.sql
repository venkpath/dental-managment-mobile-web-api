-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "preferred_language" VARCHAR(5) NOT NULL DEFAULT 'en';

-- CreateTable
CREATE TABLE "message_templates" (
    "id" UUID NOT NULL,
    "clinic_id" UUID,
    "channel" VARCHAR(20) NOT NULL,
    "category" VARCHAR(30) NOT NULL,
    "template_name" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(500),
    "body" TEXT NOT NULL,
    "variables" JSONB,
    "language" VARCHAR(5) NOT NULL DEFAULT 'en',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "dlt_template_id" VARCHAR(100),
    "whatsapp_template_status" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_messages" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID,
    "template_id" UUID,
    "channel" VARCHAR(20) NOT NULL,
    "category" VARCHAR(20) NOT NULL DEFAULT 'transactional',
    "subject" VARCHAR(500),
    "body" TEXT NOT NULL,
    "recipient" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'queued',
    "skip_reason" VARCHAR(255),
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_logs" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "provider_message_id" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL,
    "error_message" TEXT,
    "cost" DECIMAL(10,4),
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_communication_preferences" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "allow_email" BOOLEAN NOT NULL DEFAULT true,
    "allow_sms" BOOLEAN NOT NULL DEFAULT true,
    "allow_whatsapp" BOOLEAN NOT NULL DEFAULT true,
    "allow_marketing" BOOLEAN NOT NULL DEFAULT true,
    "allow_reminders" BOOLEAN NOT NULL DEFAULT true,
    "preferred_channel" VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
    "quiet_hours_start" VARCHAR(5),
    "quiet_hours_end" VARCHAR(5),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_communication_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_communication_settings" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "enable_email" BOOLEAN NOT NULL DEFAULT false,
    "enable_sms" BOOLEAN NOT NULL DEFAULT false,
    "enable_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "email_provider" VARCHAR(50),
    "email_config" JSONB,
    "sms_provider" VARCHAR(50),
    "sms_config" JSONB,
    "whatsapp_provider" VARCHAR(50),
    "whatsapp_config" JSONB,
    "fallback_chain" JSONB DEFAULT '["whatsapp", "sms", "email"]',
    "default_reminder_channels" JSONB DEFAULT '["whatsapp"]',
    "daily_message_limit" INTEGER NOT NULL DEFAULT 1000,
    "send_rate_per_minute" INTEGER NOT NULL DEFAULT 100,
    "google_review_url" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_communication_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_audit_logs" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "field_changed" VARCHAR(100) NOT NULL,
    "old_value" VARCHAR(255) NOT NULL,
    "new_value" VARCHAR(255) NOT NULL,
    "changed_by" VARCHAR(50) NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "ip_address" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "message_templates_clinic_id_idx" ON "message_templates"("clinic_id");

-- CreateIndex
CREATE INDEX "message_templates_channel_idx" ON "message_templates"("channel");

-- CreateIndex
CREATE INDEX "message_templates_category_idx" ON "message_templates"("category");

-- CreateIndex
CREATE INDEX "message_templates_clinic_id_channel_category_idx" ON "message_templates"("clinic_id", "channel", "category");

-- CreateIndex
CREATE INDEX "communication_messages_clinic_id_idx" ON "communication_messages"("clinic_id");

-- CreateIndex
CREATE INDEX "communication_messages_patient_id_idx" ON "communication_messages"("patient_id");

-- CreateIndex
CREATE INDEX "communication_messages_template_id_idx" ON "communication_messages"("template_id");

-- CreateIndex
CREATE INDEX "communication_messages_channel_idx" ON "communication_messages"("channel");

-- CreateIndex
CREATE INDEX "communication_messages_status_idx" ON "communication_messages"("status");

-- CreateIndex
CREATE INDEX "communication_messages_clinic_id_channel_status_idx" ON "communication_messages"("clinic_id", "channel", "status");

-- CreateIndex
CREATE INDEX "communication_messages_scheduled_at_idx" ON "communication_messages"("scheduled_at");

-- CreateIndex
CREATE INDEX "communication_messages_created_at_idx" ON "communication_messages"("created_at");

-- CreateIndex
CREATE INDEX "communication_logs_message_id_idx" ON "communication_logs"("message_id");

-- CreateIndex
CREATE INDEX "communication_logs_channel_idx" ON "communication_logs"("channel");

-- CreateIndex
CREATE INDEX "communication_logs_status_idx" ON "communication_logs"("status");

-- CreateIndex
CREATE INDEX "communication_logs_provider_idx" ON "communication_logs"("provider");

-- CreateIndex
CREATE INDEX "communication_logs_created_at_idx" ON "communication_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "patient_communication_preferences_patient_id_key" ON "patient_communication_preferences"("patient_id");

-- CreateIndex
CREATE INDEX "patient_communication_preferences_patient_id_idx" ON "patient_communication_preferences"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_communication_settings_clinic_id_key" ON "clinic_communication_settings"("clinic_id");

-- CreateIndex
CREATE INDEX "clinic_communication_settings_clinic_id_idx" ON "clinic_communication_settings"("clinic_id");

-- CreateIndex
CREATE INDEX "consent_audit_logs_patient_id_idx" ON "consent_audit_logs"("patient_id");

-- CreateIndex
CREATE INDEX "consent_audit_logs_created_at_idx" ON "consent_audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "communication_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_communication_preferences" ADD CONSTRAINT "patient_communication_preferences_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_communication_settings" ADD CONSTRAINT "clinic_communication_settings_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
