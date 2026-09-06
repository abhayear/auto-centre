-- AlterTable
ALTER TABLE "ReplacementClaim" ADD COLUMN "caseNumber" TEXT;
ALTER TABLE "ReplacementClaim" ADD COLUMN "billDate" DATE;
ALTER TABLE "ReplacementClaim" ADD COLUMN "warrantyMonths" INTEGER;
ALTER TABLE "ReplacementClaim" ADD COLUMN "fault" TEXT;
ALTER TABLE "ReplacementClaim" ADD COLUMN "destination" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ReplacementClaim_caseNumber_key" ON "ReplacementClaim"("caseNumber");
CREATE INDEX "ReplacementClaim_destination_idx" ON "ReplacementClaim"("destination");

-- CreateTable
CREATE TABLE "ReplacementStockItem" (
    "id" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "modelCode" TEXT,
    "serialNumber" TEXT,
    "ah" DOUBLE PRECISION,
    "voltage" TEXT,
    "result" TEXT NOT NULL DEFAULT 'repaired',
    "source" TEXT NOT NULL,
    "sourceClaimId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "receivedDate" DATE NOT NULL,
    "allocatedClaimId" TEXT,
    "allocatedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReplacementStockItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReplacementStockItem_status_idx" ON "ReplacementStockItem"("status");
CREATE INDEX "ReplacementStockItem_itemType_idx" ON "ReplacementStockItem"("itemType");
CREATE INDEX "ReplacementStockItem_receivedDate_idx" ON "ReplacementStockItem"("receivedDate");
CREATE INDEX "ReplacementStockItem_sourceClaimId_idx" ON "ReplacementStockItem"("sourceClaimId");
CREATE INDEX "ReplacementStockItem_allocatedClaimId_idx" ON "ReplacementStockItem"("allocatedClaimId");

-- AddForeignKey
ALTER TABLE "ReplacementStockItem" ADD CONSTRAINT "ReplacementStockItem_sourceClaimId_fkey" FOREIGN KEY ("sourceClaimId") REFERENCES "ReplacementClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReplacementStockItem" ADD CONSTRAINT "ReplacementStockItem_allocatedClaimId_fkey" FOREIGN KEY ("allocatedClaimId") REFERENCES "ReplacementClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;
