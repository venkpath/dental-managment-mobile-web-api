-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255),
    "gender" VARCHAR(20) NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "blood_group" VARCHAR(10),
    "medical_history" JSONB DEFAULT '{}',
    "allergies" VARCHAR(1000),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patients_clinic_id_idx" ON "patients"("clinic_id");

-- CreateIndex
CREATE INDEX "patients_branch_id_idx" ON "patients"("branch_id");

-- CreateIndex
CREATE INDEX "patients_clinic_id_branch_id_idx" ON "patients"("clinic_id", "branch_id");

-- CreateIndex
CREATE INDEX "patients_phone_idx" ON "patients"("phone");

-- CreateIndex
CREATE INDEX "patients_first_name_last_name_idx" ON "patients"("first_name", "last_name");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
