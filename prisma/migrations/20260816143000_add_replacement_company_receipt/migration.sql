-- AlterTable
ALTER TABLE "ReplacementClaim" ADD COLUMN "sentToCompanyDate" DATE;
ALTER TABLE "ReplacementClaim" ADD COLUMN "companyReceivedDate" DATE;
ALTER TABLE "ReplacementClaim" ADD COLUMN "companyInvoiceNumber" TEXT;
ALTER TABLE "ReplacementClaim" ADD COLUMN "companyDeliveryNote" TEXT;

-- CreateIndex
CREATE INDEX "ReplacementClaim_sentToCompanyDate_idx" ON "ReplacementClaim"("sentToCompanyDate");
