-- AlterTable: Add new fields to users
ALTER TABLE "users" ADD COLUMN "name" VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "branch_id" UUID;
ALTER TABLE "users" ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'active';

-- Remove default after backfill
ALTER TABLE "users" ALTER COLUMN "name" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "users_branch_id_idx" ON "users"("branch_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
