-- CreateTable
CREATE TABLE "expense_categories" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(50),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "branch_id" UUID,
    "category_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" DATE NOT NULL,
    "payment_mode" VARCHAR(30),
    "vendor" VARCHAR(255),
    "receipt_url" VARCHAR(1000),
    "notes" TEXT,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurring_frequency" VARCHAR(20),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_categories_clinic_id_idx" ON "expense_categories"("clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_clinic_id_name_key" ON "expense_categories"("clinic_id", "name");

-- CreateIndex
CREATE INDEX "expenses_clinic_id_idx" ON "expenses"("clinic_id");

-- CreateIndex
CREATE INDEX "expenses_clinic_id_date_idx" ON "expenses"("clinic_id", "date");

-- CreateIndex
CREATE INDEX "expenses_clinic_id_category_id_idx" ON "expenses"("clinic_id", "category_id");

-- CreateIndex
CREATE INDEX "expenses_branch_id_idx" ON "expenses"("branch_id");

-- CreateIndex
CREATE INDEX "expenses_created_by_idx" ON "expenses"("created_by");

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "communication_messages_clinic_id_channel_recipient_created_at_i" RENAME TO "communication_messages_clinic_id_channel_recipient_created__idx";
