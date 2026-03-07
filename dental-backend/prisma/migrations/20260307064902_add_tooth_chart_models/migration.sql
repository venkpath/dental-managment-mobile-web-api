-- CreateTable
CREATE TABLE "teeth" (
    "id" UUID NOT NULL,
    "fdi_number" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "quadrant" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "teeth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tooth_surfaces" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "code" VARCHAR(10) NOT NULL,

    CONSTRAINT "tooth_surfaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_tooth_conditions" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "tooth_id" UUID NOT NULL,
    "surface_id" UUID,
    "condition" VARCHAR(100) NOT NULL,
    "severity" VARCHAR(20),
    "notes" TEXT,
    "diagnosed_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_tooth_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teeth_fdi_number_key" ON "teeth"("fdi_number");

-- CreateIndex
CREATE UNIQUE INDEX "tooth_surfaces_name_key" ON "tooth_surfaces"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tooth_surfaces_code_key" ON "tooth_surfaces"("code");

-- CreateIndex
CREATE INDEX "patient_tooth_conditions_clinic_id_idx" ON "patient_tooth_conditions"("clinic_id");

-- CreateIndex
CREATE INDEX "patient_tooth_conditions_patient_id_idx" ON "patient_tooth_conditions"("patient_id");

-- CreateIndex
CREATE INDEX "patient_tooth_conditions_tooth_id_idx" ON "patient_tooth_conditions"("tooth_id");

-- CreateIndex
CREATE INDEX "patient_tooth_conditions_patient_id_tooth_id_idx" ON "patient_tooth_conditions"("patient_id", "tooth_id");

-- AddForeignKey
ALTER TABLE "patient_tooth_conditions" ADD CONSTRAINT "patient_tooth_conditions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_tooth_conditions" ADD CONSTRAINT "patient_tooth_conditions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_tooth_conditions" ADD CONSTRAINT "patient_tooth_conditions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_tooth_conditions" ADD CONSTRAINT "patient_tooth_conditions_tooth_id_fkey" FOREIGN KEY ("tooth_id") REFERENCES "teeth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_tooth_conditions" ADD CONSTRAINT "patient_tooth_conditions_surface_id_fkey" FOREIGN KEY ("surface_id") REFERENCES "tooth_surfaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_tooth_conditions" ADD CONSTRAINT "patient_tooth_conditions_diagnosed_by_fkey" FOREIGN KEY ("diagnosed_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
