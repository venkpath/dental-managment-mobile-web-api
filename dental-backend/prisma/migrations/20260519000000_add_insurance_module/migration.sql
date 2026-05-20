-- ─── Insurance & EHS module (Phase 7) ───────────────────────────────────
-- End-to-end claim lifecycle: providers + plans + procedure codes +
-- clinic empanelment + patient enrollment + pre-auth + claims + status
-- history + attachments + reimbursements + allocations.

-- Add insurance-related columns to invoices (denormalised for fast filters
-- on the invoice list / patient bill view; the canonical claim record still
-- lives in insurance_claims).
ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "patient_insurance_id" UUID,
  ADD COLUMN IF NOT EXISTS "insurance_covered_amount" DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS "patient_copay_amount" DECIMAL(10, 2);

CREATE INDEX IF NOT EXISTS "invoices_patient_insurance_id_idx" ON "invoices" ("patient_insurance_id");

-- ─── insurance_providers ────────────────────────────────────────────────
CREATE TABLE "insurance_providers" (
  "id"            UUID NOT NULL,
  "clinic_id"     UUID,
  "name"          VARCHAR(200) NOT NULL,
  "short_code"    VARCHAR(50) NOT NULL,
  "type"          VARCHAR(30) NOT NULL,
  "country"       VARCHAR(5) NOT NULL,
  "contact_email" VARCHAR(255),
  "contact_phone" VARCHAR(50),
  "website"       VARCHAR(500),
  "claim_method"  VARCHAR(20) NOT NULL DEFAULT 'PHYSICAL',
  "tpa_name"      VARCHAR(200),
  "notes"         TEXT,
  "is_active"     BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "insurance_providers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "insurance_providers_clinic_id_short_code_key"
  ON "insurance_providers" ("clinic_id", "short_code");
CREATE INDEX "insurance_providers_country_idx"   ON "insurance_providers" ("country");
CREATE INDEX "insurance_providers_type_idx"      ON "insurance_providers" ("type");
CREATE INDEX "insurance_providers_clinic_id_idx" ON "insurance_providers" ("clinic_id");

ALTER TABLE "insurance_providers"
  ADD CONSTRAINT "insurance_providers_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── insurance_plans ────────────────────────────────────────────────────
CREATE TABLE "insurance_plans" (
  "id"                  UUID NOT NULL,
  "provider_id"         UUID NOT NULL,
  "plan_name"           VARCHAR(200) NOT NULL,
  "plan_code"           VARCHAR(100),
  "coverage_rules"      JSONB NOT NULL DEFAULT '{}',
  "preventive_coverage" INTEGER NOT NULL DEFAULT 100,
  "basic_coverage"      INTEGER NOT NULL DEFAULT 80,
  "major_coverage"      INTEGER NOT NULL DEFAULT 50,
  "ortho_coverage"      INTEGER NOT NULL DEFAULT 0,
  "annual_max_amount"   DECIMAL(12, 2),
  "deductible_amount"   DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "currency"            VARCHAR(5) NOT NULL DEFAULT 'INR',
  "requires_preauth"    BOOLEAN NOT NULL DEFAULT FALSE,
  "requires_referral"   BOOLEAN NOT NULL DEFAULT FALSE,
  "is_active"           BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL,
  CONSTRAINT "insurance_plans_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "insurance_plans_provider_id_idx" ON "insurance_plans" ("provider_id");

ALTER TABLE "insurance_plans"
  ADD CONSTRAINT "insurance_plans_provider_id_fkey"
  FOREIGN KEY ("provider_id") REFERENCES "insurance_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── insurance_procedure_codes ──────────────────────────────────────────
CREATE TABLE "insurance_procedure_codes" (
  "id"                  UUID NOT NULL,
  "plan_id"             UUID NOT NULL,
  "code"                VARCHAR(30) NOT NULL,
  "description"         VARCHAR(500) NOT NULL,
  "category"            VARCHAR(20) NOT NULL,
  "coverage_pct"        INTEGER NOT NULL DEFAULT 100,
  "max_fee"             DECIMAL(10, 2),
  "waiting_period_days" INTEGER NOT NULL DEFAULT 0,
  "frequency_limit"     VARCHAR(100),
  "notes"               VARCHAR(500),
  CONSTRAINT "insurance_procedure_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "insurance_procedure_codes_plan_id_code_key"
  ON "insurance_procedure_codes" ("plan_id", "code");
CREATE INDEX "insurance_procedure_codes_plan_id_idx" ON "insurance_procedure_codes" ("plan_id");

ALTER TABLE "insurance_procedure_codes"
  ADD CONSTRAINT "insurance_procedure_codes_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "insurance_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── clinic_empanelments ────────────────────────────────────────────────
CREATE TABLE "clinic_empanelments" (
  "id"                   UUID NOT NULL,
  "clinic_id"            UUID NOT NULL,
  "provider_id"          UUID NOT NULL,
  "empanelment_number"   VARCHAR(100) NOT NULL,
  "valid_from"           DATE,
  "valid_to"             DATE,
  "certificate_url"      VARCHAR(500),
  "rate_card_url"        VARCHAR(500),
  "tpa_mou_url"          VARCHAR(500),
  "bank_account_name"    VARCHAR(200),
  "bank_account_number"  VARCHAR(50),
  "bank_ifsc"            VARCHAR(20),
  "bank_name"            VARCHAR(200),
  "contact_person_name"  VARCHAR(200),
  "contact_person_phone" VARCHAR(50),
  "contact_person_email" VARCHAR(255),
  "notes"                TEXT,
  "status"               VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"           TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinic_empanelments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clinic_empanelments_clinic_id_provider_id_key"
  ON "clinic_empanelments" ("clinic_id", "provider_id");
CREATE INDEX "clinic_empanelments_clinic_id_idx"   ON "clinic_empanelments" ("clinic_id");
CREATE INDEX "clinic_empanelments_provider_id_idx" ON "clinic_empanelments" ("provider_id");
CREATE INDEX "clinic_empanelments_valid_to_idx"    ON "clinic_empanelments" ("valid_to");

ALTER TABLE "clinic_empanelments"
  ADD CONSTRAINT "clinic_empanelments_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinic_empanelments"
  ADD CONSTRAINT "clinic_empanelments_provider_id_fkey"
  FOREIGN KEY ("provider_id") REFERENCES "insurance_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── patient_insurances ─────────────────────────────────────────────────
CREATE TABLE "patient_insurances" (
  "id"                  UUID NOT NULL,
  "patient_id"          UUID NOT NULL,
  "clinic_id"           UUID NOT NULL,
  "plan_id"             UUID NOT NULL,
  "priority"            INTEGER NOT NULL DEFAULT 1,
  "member_id"           VARCHAR(100) NOT NULL,
  "group_number"        VARCHAR(100),
  "employee_id"         VARCHAR(100),
  "beneficiary_id"      VARCHAR(100),
  "company_name"        VARCHAR(200),
  "subscriber_name"     VARCHAR(200),
  "relationship"        VARCHAR(50),
  "coverage_start"      DATE,
  "coverage_end"        DATE,
  "card_front_url"      VARCHAR(500),
  "card_back_url"       VARCHAR(500),
  "referral_letter_url" VARCHAR(500),
  "is_active"           BOOLEAN NOT NULL DEFAULT TRUE,
  "notes"               TEXT,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL,
  CONSTRAINT "patient_insurances_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "patient_insurances_patient_id_idx" ON "patient_insurances" ("patient_id");
CREATE INDEX "patient_insurances_clinic_id_idx"  ON "patient_insurances" ("clinic_id");
CREATE INDEX "patient_insurances_plan_id_idx"    ON "patient_insurances" ("plan_id");

ALTER TABLE "patient_insurances"
  ADD CONSTRAINT "patient_insurances_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_insurances"
  ADD CONSTRAINT "patient_insurances_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_insurances"
  ADD CONSTRAINT "patient_insurances_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "insurance_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_patient_insurance_id_fkey"
  FOREIGN KEY ("patient_insurance_id") REFERENCES "patient_insurances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── insurance_pre_auths ────────────────────────────────────────────────
CREATE TABLE "insurance_pre_auths" (
  "id"                   UUID NOT NULL,
  "clinic_id"            UUID NOT NULL,
  "patient_insurance_id" UUID NOT NULL,
  "treatment_plan_id"    UUID,
  "submission_method"    VARCHAR(20),
  "submission_ref"       VARCHAR(100),
  "submitted_at"         TIMESTAMP(3),
  "submitted_by_user_id" UUID,
  "request_pdf_url"      VARCHAR(500),
  "approval_letter_url"  VARCHAR(500),
  "rejection_letter_url" VARCHAR(500),
  "approval_code"        VARCHAR(100),
  "approved_amount_cap"  DECIMAL(10, 2),
  "valid_from"           DATE,
  "valid_to"             DATE,
  "status"               VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
  "decision_at"          TIMESTAMP(3),
  "notes"                TEXT,
  "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"           TIMESTAMP(3) NOT NULL,
  CONSTRAINT "insurance_pre_auths_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "insurance_pre_auths_clinic_id_idx"            ON "insurance_pre_auths" ("clinic_id");
CREATE INDEX "insurance_pre_auths_patient_insurance_id_idx" ON "insurance_pre_auths" ("patient_insurance_id");
CREATE INDEX "insurance_pre_auths_status_idx"               ON "insurance_pre_auths" ("status");

ALTER TABLE "insurance_pre_auths"
  ADD CONSTRAINT "insurance_pre_auths_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "insurance_pre_auths"
  ADD CONSTRAINT "insurance_pre_auths_patient_insurance_id_fkey"
  FOREIGN KEY ("patient_insurance_id") REFERENCES "patient_insurances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── insurance_claims ───────────────────────────────────────────────────
CREATE TABLE "insurance_claims" (
  "id"                       UUID NOT NULL,
  "clinic_id"                UUID NOT NULL,
  "invoice_id"               UUID NOT NULL,
  "patient_insurance_id"     UUID NOT NULL,
  "claim_number"             VARCHAR(100),
  "pre_auth_code"            VARCHAR(100),
  "pre_auth_id"              UUID,
  "billed_amount"            DECIMAL(10, 2) NOT NULL,
  "approved_amount"          DECIMAL(10, 2),
  "patient_portion"          DECIMAL(10, 2),
  "disallowed_amount"        DECIMAL(10, 2),
  "paid_amount"              DECIMAL(10, 2),
  "currency"                 VARCHAR(5) NOT NULL DEFAULT 'INR',
  "status"                   VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  "submission_method"        VARCHAR(20),
  "submission_ref"           VARCHAR(100),
  "submitted_at"             TIMESTAMP(3),
  "submitted_by_user_id"     UUID,
  "decision_at"              TIMESTAMP(3),
  "paid_at"                  TIMESTAMP(3),
  "rejection_reason"         VARCHAR(1000),
  "query_text"               TEXT,
  "query_response_at"        TIMESTAMP(3),
  "claim_form_url"           VARCHAR(500),
  "consolidated_package_url" VARCHAR(500),
  "notes"                    TEXT,
  "created_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               TIMESTAMP(3) NOT NULL,
  CONSTRAINT "insurance_claims_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "insurance_claims_clinic_id_idx"            ON "insurance_claims" ("clinic_id");
CREATE INDEX "insurance_claims_invoice_id_idx"           ON "insurance_claims" ("invoice_id");
CREATE INDEX "insurance_claims_patient_insurance_id_idx" ON "insurance_claims" ("patient_insurance_id");
CREATE INDEX "insurance_claims_status_idx"               ON "insurance_claims" ("status");

ALTER TABLE "insurance_claims"
  ADD CONSTRAINT "insurance_claims_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "insurance_claims"
  ADD CONSTRAINT "insurance_claims_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "insurance_claims"
  ADD CONSTRAINT "insurance_claims_patient_insurance_id_fkey"
  FOREIGN KEY ("patient_insurance_id") REFERENCES "patient_insurances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── insurance_claim_status_history ─────────────────────────────────────
CREATE TABLE "insurance_claim_status_history" (
  "id"                 UUID NOT NULL,
  "claim_id"           UUID NOT NULL,
  "from_status"        VARCHAR(30),
  "to_status"          VARCHAR(30) NOT NULL,
  "changed_by_user_id" UUID,
  "note"               VARCHAR(1000),
  "changed_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "insurance_claim_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "insurance_claim_status_history_claim_id_idx"
  ON "insurance_claim_status_history" ("claim_id");

ALTER TABLE "insurance_claim_status_history"
  ADD CONSTRAINT "insurance_claim_status_history_claim_id_fkey"
  FOREIGN KEY ("claim_id") REFERENCES "insurance_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── insurance_claim_attachments ────────────────────────────────────────
CREATE TABLE "insurance_claim_attachments" (
  "id"                  UUID NOT NULL,
  "claim_id"            UUID NOT NULL,
  "type"                VARCHAR(30) NOT NULL,
  "file_url"            VARCHAR(500) NOT NULL,
  "file_name"           VARCHAR(255) NOT NULL,
  "original_name"       VARCHAR(255) NOT NULL,
  "mime_type"           VARCHAR(100) NOT NULL,
  "size_bytes"          INTEGER,
  "uploaded_by_user_id" UUID,
  "description"         VARCHAR(500),
  "uploaded_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "insurance_claim_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "insurance_claim_attachments_claim_id_idx" ON "insurance_claim_attachments" ("claim_id");
CREATE INDEX "insurance_claim_attachments_type_idx"     ON "insurance_claim_attachments" ("type");

ALTER TABLE "insurance_claim_attachments"
  ADD CONSTRAINT "insurance_claim_attachments_claim_id_fkey"
  FOREIGN KEY ("claim_id") REFERENCES "insurance_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── insurance_reimbursements ───────────────────────────────────────────
CREATE TABLE "insurance_reimbursements" (
  "id"                  UUID NOT NULL,
  "clinic_id"           UUID NOT NULL,
  "received_at"         DATE NOT NULL,
  "amount_received"     DECIMAL(12, 2) NOT NULL,
  "tds_deducted"        DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "bank_utr_ref"        VARCHAR(100),
  "currency"            VARCHAR(5) NOT NULL DEFAULT 'INR',
  "proof_document_url"  VARCHAR(500),
  "recorded_by_user_id" UUID,
  "notes"               TEXT,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL,
  CONSTRAINT "insurance_reimbursements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "insurance_reimbursements_clinic_id_idx"   ON "insurance_reimbursements" ("clinic_id");
CREATE INDEX "insurance_reimbursements_received_at_idx" ON "insurance_reimbursements" ("received_at");

ALTER TABLE "insurance_reimbursements"
  ADD CONSTRAINT "insurance_reimbursements_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── insurance_reimbursement_allocations ────────────────────────────────
CREATE TABLE "insurance_reimbursement_allocations" (
  "id"                  UUID NOT NULL,
  "reimbursement_id"    UUID NOT NULL,
  "claim_id"            UUID NOT NULL,
  "allocated_amount"    DECIMAL(10, 2) NOT NULL,
  "disallowed_amount"   DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "disallowance_reason" VARCHAR(500),
  "action_taken"        VARCHAR(20) NOT NULL DEFAULT 'NONE',
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "insurance_reimbursement_allocations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "insurance_reimbursement_allocations_reimbursement_id_claim_id_key"
  ON "insurance_reimbursement_allocations" ("reimbursement_id", "claim_id");
CREATE INDEX "insurance_reimbursement_allocations_reimbursement_id_idx"
  ON "insurance_reimbursement_allocations" ("reimbursement_id");
CREATE INDEX "insurance_reimbursement_allocations_claim_id_idx"
  ON "insurance_reimbursement_allocations" ("claim_id");

ALTER TABLE "insurance_reimbursement_allocations"
  ADD CONSTRAINT "insurance_reimbursement_allocations_reimbursement_id_fkey"
  FOREIGN KEY ("reimbursement_id") REFERENCES "insurance_reimbursements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "insurance_reimbursement_allocations"
  ADD CONSTRAINT "insurance_reimbursement_allocations_claim_id_fkey"
  FOREIGN KEY ("claim_id") REFERENCES "insurance_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
