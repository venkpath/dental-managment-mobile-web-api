-- Consent Forms — templates + per-patient instances
CREATE TABLE IF NOT EXISTS "consent_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "language" VARCHAR(5) NOT NULL DEFAULT 'en',
    "title" VARCHAR(255) NOT NULL,
    "body" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "consent_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "consent_templates_clinic_id_code_language_key"
  ON "consent_templates"("clinic_id", "code", "language");
CREATE INDEX IF NOT EXISTS "consent_templates_clinic_id_idx" ON "consent_templates"("clinic_id");
CREATE INDEX IF NOT EXISTS "consent_templates_clinic_id_is_active_idx" ON "consent_templates"("clinic_id", "is_active");

ALTER TABLE "consent_templates"
  ADD CONSTRAINT "consent_templates_clinic_id_fkey" FOREIGN KEY ("clinic_id")
    REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "consent_templates_created_by_fkey" FOREIGN KEY ("created_by")
    REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "patient_consents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "treatment_id" UUID,
    "appointment_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "template_version" INTEGER NOT NULL DEFAULT 1,
    "language" VARCHAR(5) NOT NULL DEFAULT 'en',
    "generated_pdf_key" VARCHAR(500),
    "signed_pdf_key" VARCHAR(500),
    "signature_method" VARCHAR(20),
    "signed_by_name" VARCHAR(255),
    "signed_at" TIMESTAMP(3),
    "signed_by_staff_id" UUID,
    "witness_staff_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "patient_consents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "patient_consents_clinic_id_idx" ON "patient_consents"("clinic_id");
CREATE INDEX IF NOT EXISTS "patient_consents_clinic_id_patient_id_idx" ON "patient_consents"("clinic_id", "patient_id");
CREATE INDEX IF NOT EXISTS "patient_consents_clinic_id_status_idx" ON "patient_consents"("clinic_id", "status");
CREATE INDEX IF NOT EXISTS "patient_consents_template_id_idx" ON "patient_consents"("template_id");
CREATE INDEX IF NOT EXISTS "patient_consents_treatment_id_idx" ON "patient_consents"("treatment_id");

ALTER TABLE "patient_consents"
  ADD CONSTRAINT "patient_consents_clinic_id_fkey" FOREIGN KEY ("clinic_id")
    REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "patient_consents_branch_id_fkey" FOREIGN KEY ("branch_id")
    REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "patient_consents_patient_id_fkey" FOREIGN KEY ("patient_id")
    REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "patient_consents_template_id_fkey" FOREIGN KEY ("template_id")
    REFERENCES "consent_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "patient_consents_treatment_id_fkey" FOREIGN KEY ("treatment_id")
    REFERENCES "treatments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "patient_consents_appointment_id_fkey" FOREIGN KEY ("appointment_id")
    REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "patient_consents_signed_by_staff_id_fkey" FOREIGN KEY ("signed_by_staff_id")
    REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "patient_consents_witness_staff_id_fkey" FOREIGN KEY ("witness_staff_id")
    REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
