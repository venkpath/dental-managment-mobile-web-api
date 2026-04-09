-- AlterTable: add pincode to clinics
ALTER TABLE "clinics" ADD COLUMN "pincode" VARCHAR(10);

-- AlterTable: add pincode to branches
ALTER TABLE "branches" ADD COLUMN "pincode" VARCHAR(10);
