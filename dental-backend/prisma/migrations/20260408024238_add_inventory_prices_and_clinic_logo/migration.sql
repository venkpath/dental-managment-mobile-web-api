-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "logo_url" TEXT;

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "price_per_box" DECIMAL(10,2),
ADD COLUMN     "price_per_unit" DECIMAL(10,2),
ADD COLUMN     "units_per_box" INTEGER;
