-- CreateTable
CREATE TABLE "inventory_items" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100),
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unit" VARCHAR(50) NOT NULL,
    "reorder_level" INTEGER NOT NULL DEFAULT 0,
    "supplier" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_items_clinic_id_idx" ON "inventory_items"("clinic_id");

-- CreateIndex
CREATE INDEX "inventory_items_branch_id_idx" ON "inventory_items"("branch_id");

-- CreateIndex
CREATE INDEX "inventory_items_clinic_id_branch_id_idx" ON "inventory_items"("clinic_id", "branch_id");

-- CreateIndex
CREATE INDEX "inventory_items_name_idx" ON "inventory_items"("name");

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
