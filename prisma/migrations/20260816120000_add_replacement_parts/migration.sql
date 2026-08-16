-- CreateTable
CREATE TABLE "ReplacementClaim" (
    "id" TEXT NOT NULL,
    "receivedDate" DATE NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "billNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received_from_customer',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplacementClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplacementClaimItem" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "modelCode" TEXT,
    "serialNumber" TEXT,
    "ah" DOUBLE PRECISION,
    "voltage" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReplacementClaimItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReplacementClaim_receivedDate_idx" ON "ReplacementClaim"("receivedDate");

-- CreateIndex
CREATE INDEX "ReplacementClaim_status_idx" ON "ReplacementClaim"("status");

-- AddForeignKey
ALTER TABLE "ReplacementClaimItem" ADD CONSTRAINT "ReplacementClaimItem_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "ReplacementClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
