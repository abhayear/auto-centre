-- Additive: how a part was sent (serial or batch) becomes the tracking key.
ALTER TABLE "ReplacementClaim" ADD COLUMN "trackingMode" TEXT NOT NULL DEFAULT 'serial';
ALTER TABLE "ReplacementClaim" ADD COLUMN "batchNumber" TEXT;

ALTER TABLE "ReplacementClaimItem" ADD COLUMN "trackingMode" TEXT NOT NULL DEFAULT 'serial';
ALTER TABLE "ReplacementClaimItem" ADD COLUMN "batchNumber" TEXT;

ALTER TABLE "ReplacementStockItem" ADD COLUMN "batchNumber" TEXT;

ALTER TABLE "WarrantyComponent" ALTER COLUMN "serialNumber" DROP NOT NULL;
ALTER TABLE "WarrantyComponent" ADD COLUMN "trackingMode" TEXT NOT NULL DEFAULT 'serial';
ALTER TABLE "WarrantyComponent" ADD COLUMN "batchNumber" TEXT;

CREATE INDEX "ReplacementClaim_batchNumber_idx" ON "ReplacementClaim"("batchNumber");
CREATE INDEX "ReplacementClaimItem_batchNumber_idx" ON "ReplacementClaimItem"("batchNumber");
CREATE INDEX "ReplacementStockItem_batchNumber_idx" ON "ReplacementStockItem"("batchNumber");
CREATE INDEX "WarrantyComponent_batchNumber_idx" ON "WarrantyComponent"("batchNumber");
