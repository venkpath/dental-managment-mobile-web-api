-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "markup_percent" DECIMAL(5,2),
ADD COLUMN     "pack_unit" VARCHAR(50),
ADD COLUMN     "packs_per_purchase" INTEGER,
ADD COLUMN     "purchase_price" DECIMAL(10,2),
ADD COLUMN     "purchase_unit" VARCHAR(50),
ADD COLUMN     "units_in_purchase" INTEGER,
ADD COLUMN     "units_per_pack" INTEGER;
