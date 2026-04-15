-- CreateTable: clinical_visits
CREATE TABLE "clinical_visits" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "dentist_id" UUID NOT NULL,
    "appointment_id" UUID,
    "chief_complaint" TEXT,
    "history_of_present_illness" TEXT,
    "past_dental_history" TEXT,
    "medical_history_notes" TEXT,
    "examination_notes" TEXT,
    "vital_signs" JSONB,
    "diagnosis_summary" TEXT,
    "soap_notes" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    "finalized_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable: treatment_plans
CREATE TABLE "treatment_plans" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "dentist_id" UUID NOT NULL,
    "clinical_visit_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "notes" TEXT,
    "total_estimated_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'proposed',
    "accepted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable: treatment_plan_items
CREATE TABLE "treatment_plan_items" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "tooth_number" VARCHAR(100),
    "procedure" VARCHAR(500) NOT NULL,
    "diagnosis" VARCHAR(500),
    "estimated_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "urgency" VARCHAR(20),
    "phase" INTEGER DEFAULT 1,
    "sequence" INTEGER DEFAULT 1,
    "status" VARCHAR(20) NOT NULL DEFAULT 'proposed',
    "notes" TEXT,
    "treatment_id" UUID,

    CONSTRAINT "treatment_plan_items_pkey" PRIMARY KEY ("id")
);

-- AlterTable: treatments — add clinical_visit_id & treatment_plan_id
ALTER TABLE "treatments"
    ADD COLUMN "clinical_visit_id" UUID,
    ADD COLUMN "treatment_plan_id" UUID;

-- AlterTable: patient_tooth_conditions — add clinical_visit_id
ALTER TABLE "patient_tooth_conditions"
    ADD COLUMN "clinical_visit_id" UUID;

-- CreateIndex: clinical_visits
CREATE INDEX "clinical_visits_clinic_id_idx" ON "clinical_visits"("clinic_id");
CREATE INDEX "clinical_visits_branch_id_idx" ON "clinical_visits"("branch_id");
CREATE INDEX "clinical_visits_patient_id_idx" ON "clinical_visits"("patient_id");
CREATE INDEX "clinical_visits_dentist_id_idx" ON "clinical_visits"("dentist_id");
CREATE INDEX "clinical_visits_appointment_id_idx" ON "clinical_visits"("appointment_id");
CREATE INDEX "clinical_visits_patient_id_created_at_idx" ON "clinical_visits"("patient_id", "created_at");

-- CreateIndex: treatment_plans
CREATE INDEX "treatment_plans_clinic_id_idx" ON "treatment_plans"("clinic_id");
CREATE INDEX "treatment_plans_branch_id_idx" ON "treatment_plans"("branch_id");
CREATE INDEX "treatment_plans_patient_id_idx" ON "treatment_plans"("patient_id");
CREATE INDEX "treatment_plans_dentist_id_idx" ON "treatment_plans"("dentist_id");
CREATE INDEX "treatment_plans_clinical_visit_id_idx" ON "treatment_plans"("clinical_visit_id");
CREATE INDEX "treatment_plans_status_idx" ON "treatment_plans"("status");

-- CreateIndex: treatment_plan_items
CREATE INDEX "treatment_plan_items_plan_id_idx" ON "treatment_plan_items"("plan_id");
CREATE INDEX "treatment_plan_items_treatment_id_idx" ON "treatment_plan_items"("treatment_id");

-- CreateIndex: treatments (new FKs)
CREATE INDEX "treatments_clinical_visit_id_idx" ON "treatments"("clinical_visit_id");
CREATE INDEX "treatments_treatment_plan_id_idx" ON "treatments"("treatment_plan_id");

-- CreateIndex: patient_tooth_conditions (new FK)
CREATE INDEX "patient_tooth_conditions_clinical_visit_id_idx" ON "patient_tooth_conditions"("clinical_visit_id");

-- AddForeignKey: clinical_visits
ALTER TABLE "clinical_visits" ADD CONSTRAINT "clinical_visits_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_visits" ADD CONSTRAINT "clinical_visits_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_visits" ADD CONSTRAINT "clinical_visits_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_visits" ADD CONSTRAINT "clinical_visits_dentist_id_fkey" FOREIGN KEY ("dentist_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_visits" ADD CONSTRAINT "clinical_visits_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: treatment_plans
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_dentist_id_fkey" FOREIGN KEY ("dentist_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_clinical_visit_id_fkey" FOREIGN KEY ("clinical_visit_id") REFERENCES "clinical_visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: treatment_plan_items
ALTER TABLE "treatment_plan_items" ADD CONSTRAINT "treatment_plan_items_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "treatment_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "treatment_plan_items" ADD CONSTRAINT "treatment_plan_items_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "treatments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: treatments (new FKs)
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_clinical_visit_id_fkey" FOREIGN KEY ("clinical_visit_id") REFERENCES "clinical_visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_treatment_plan_id_fkey" FOREIGN KEY ("treatment_plan_id") REFERENCES "treatment_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: patient_tooth_conditions (new FK)
ALTER TABLE "patient_tooth_conditions" ADD CONSTRAINT "patient_tooth_conditions_clinical_visit_id_fkey" FOREIGN KEY ("clinical_visit_id") REFERENCES "clinical_visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
