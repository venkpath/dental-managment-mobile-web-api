-- AlterTable: add self-registration QR code fields to branches
ALTER TABLE "branches"
  ADD COLUMN "qr_code_token"        VARCHAR(20),
  ADD COLUMN "qr_code_enabled"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "qr_code_generated_at" TIMESTAMP(3);

-- CreateIndex: unique QR token globally (token is already unique by design)
CREATE UNIQUE INDEX "branches_qr_code_token_key" ON "branches"("qr_code_token");
