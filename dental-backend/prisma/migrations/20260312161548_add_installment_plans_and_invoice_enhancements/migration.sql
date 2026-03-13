-- AlterTable
ALTER TABLE "invoice_items" ADD COLUMN     "item_type" VARCHAR(20) NOT NULL DEFAULT 'service';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "installment_item_id" UUID,
ADD COLUMN     "notes" VARCHAR(500);

-- CreateTable
CREATE TABLE "installment_plans" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "num_installments" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installment_items" (
    "id" UUID NOT NULL,
    "installment_plan_id" UUID NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "due_date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "installment_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "installment_plans_invoice_id_key" ON "installment_plans"("invoice_id");

-- CreateIndex
CREATE INDEX "installment_plans_invoice_id_idx" ON "installment_plans"("invoice_id");

-- CreateIndex
CREATE INDEX "installment_items_installment_plan_id_idx" ON "installment_items"("installment_plan_id");

-- CreateIndex
CREATE INDEX "payments_installment_item_id_idx" ON "payments"("installment_item_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_installment_item_id_fkey" FOREIGN KEY ("installment_item_id") REFERENCES "installment_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installment_items" ADD CONSTRAINT "installment_items_installment_plan_id_fkey" FOREIGN KEY ("installment_plan_id") REFERENCES "installment_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
