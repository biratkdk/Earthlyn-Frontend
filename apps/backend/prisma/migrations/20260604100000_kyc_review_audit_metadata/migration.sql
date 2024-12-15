-- Add persistent KYC review metadata and query indexes for admin audit screens.
ALTER TABLE "sellers"
  ADD COLUMN "kyc_reviewed_at" TIMESTAMP(3),
  ADD COLUMN "kyc_reviewed_by_id" TEXT,
  ADD COLUMN "kyc_rejection_reason" TEXT;

ALTER TABLE "seller_kyc_documents"
  ADD COLUMN "reviewed_at" TIMESTAMP(3),
  ADD COLUMN "reviewed_by_id" TEXT,
  ADD COLUMN "rejection_reason" TEXT;

CREATE INDEX "sellers_kyc_status_idx" ON "sellers"("kyc_status");
CREATE INDEX "sellers_kyc_reviewed_by_id_idx" ON "sellers"("kyc_reviewed_by_id");
CREATE INDEX "seller_kyc_documents_status_idx" ON "seller_kyc_documents"("status");
CREATE INDEX "admin_audits_entity_type_idx" ON "admin_audits"("entity_type");
CREATE INDEX "admin_audits_created_at_idx" ON "admin_audits"("created_at");
