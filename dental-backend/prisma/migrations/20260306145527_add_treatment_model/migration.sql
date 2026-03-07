-- CreateTable
CREATE TABLE "treatments" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "dentist_id" UUID NOT NULL,
    "tooth_number" VARCHAR(10),
    "diagnosis" VARCHAR(500) NOT NULL,
    "procedure" VARCHAR(500) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'planned',
    "cost" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "treatments_clinic_id_idx" ON "treatments"("clinic_id");

-- CreateIndex
CREATE INDEX "treatments_branch_id_idx" ON "treatments"("branch_id");

-- CreateIndex
CREATE INDEX "treatments_patient_id_idx" ON "treatments"("patient_id");

-- CreateIndex
CREATE INDEX "treatments_dentist_id_idx" ON "treatments"("dentist_id");

-- CreateIndex
CREATE INDEX "treatments_patient_id_tooth_number_idx" ON "treatments"("patient_id", "tooth_number");

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_dentist_id_fkey" FOREIGN KEY ("dentist_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
