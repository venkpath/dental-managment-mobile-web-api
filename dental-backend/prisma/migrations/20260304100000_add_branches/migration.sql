-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "address" VARCHAR(500),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "branches_clinic_id_idx" ON "branches"("clinic_id");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
