-- CreateTable
CREATE TABLE "ai_insights" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "data" JSONB NOT NULL,
    "context" JSONB,
    "generated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_insights_clinic_id_idx" ON "ai_insights"("clinic_id");

-- CreateIndex
CREATE INDEX "ai_insights_clinic_id_type_idx" ON "ai_insights"("clinic_id", "type");

-- CreateIndex
CREATE INDEX "ai_insights_created_at_idx" ON "ai_insights"("created_at");

-- AddForeignKey
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
