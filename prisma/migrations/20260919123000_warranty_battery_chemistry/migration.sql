-- Additive: lead vs lithium on warranty batteries. Existing rows default to lead.
ALTER TABLE "ReplacementClaimItem" ADD COLUMN "batteryChemistry" TEXT NOT NULL DEFAULT 'lead';
ALTER TABLE "ReplacementStockItem" ADD COLUMN "batteryChemistry" TEXT NOT NULL DEFAULT 'lead';
