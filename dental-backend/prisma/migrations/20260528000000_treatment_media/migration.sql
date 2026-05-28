-- CreateTable
CREATE TABLE "treatment_media" (
    "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id"     UUID         NOT NULL,
    "branch_id"     UUID         NOT NULL,
    "patient_id"    UUID         NOT NULL,
    "treatment_id"  UUID         NOT NULL,
    "file_url"      VARCHAR(1000) NOT NULL,
    "file_name"     VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type"     VARCHAR(100) NOT NULL,
    "media_type"    VARCHAR(20)  NOT NULL,
    "original_size" INTEGER      NOT NULL,
    "stored_size"   INTEGER      NOT NULL,
    "visit_date"    DATE         NOT NULL,
    "caption"       VARCHAR(500),
    "uploaded_by"   UUID         NOT NULL,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treatment_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "treatment_media_treatment_id_idx" ON "treatment_media"("treatment_id");
CREATE INDEX "treatment_media_patient_id_idx"   ON "treatment_media"("patient_id");
CREATE INDEX "treatment_media_clinic_id_idx"    ON "treatment_media"("clinic_id");
CREATE INDEX "treatment_media_visit_date_idx"   ON "treatment_media"("visit_date");

-- AddForeignKey
ALTER TABLE "treatment_media"
    ADD CONSTRAINT "treatment_media_clinic_id_fkey"
    FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "treatment_media"
    ADD CONSTRAINT "treatment_media_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "treatment_media"
    ADD CONSTRAINT "treatment_media_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "treatment_media"
    ADD CONSTRAINT "treatment_media_treatment_id_fkey"
    FOREIGN KEY ("treatment_id") REFERENCES "treatments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "treatment_media"
    ADD CONSTRAINT "treatment_media_uploaded_by_fkey"
    FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
