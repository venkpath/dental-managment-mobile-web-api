-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "recurrence_group_id" UUID;

-- CreateIndex
CREATE INDEX "appointments_recurrence_group_id_idx" ON "appointments"("recurrence_group_id");
