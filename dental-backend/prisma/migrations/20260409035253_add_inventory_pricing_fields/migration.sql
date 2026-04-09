-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "batch_number" VARCHAR(100),
ADD COLUMN     "cost_price" DECIMAL(10,2),
ADD COLUMN     "expiry_date" TIMESTAMP(3),
ADD COLUMN     "location" VARCHAR(100),
ADD COLUMN     "selling_price" DECIMAL(10,2);
