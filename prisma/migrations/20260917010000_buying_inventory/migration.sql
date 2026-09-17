-- CreateTable
CREATE TABLE "BuyingPortal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "username" TEXT NOT NULL DEFAULT '',
    "passwordEncrypted" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "connectorId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdByEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyingPortal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryPart" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "onHandQty" INTEGER NOT NULL DEFAULT 0,
    "purchaseRate" DECIMAL(12,2) NOT NULL,
    "sellingPrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalCatalogLine" (
    "id" TEXT NOT NULL,
    "portalId" TEXT NOT NULL,
    "vendorSku" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "livePurchaseRate" DECIMAL(12,2) NOT NULL,
    "inventoryPartId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalCatalogLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseBill" (
    "id" TEXT NOT NULL,
    "portalId" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "billDate" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "confirmedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseBillLine" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "inventoryPartId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "purchaseRateSnapshot" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "PurchaseBillLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "qtyDelta" INTEGER NOT NULL,
    "qtyAfter" INTEGER NOT NULL,
    "billId" TEXT,
    "jobRef" TEXT,
    "note" TEXT,
    "actorEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockCount" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "physicalQty" INTEGER NOT NULL,
    "systemQty" INTEGER NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateChangeLog" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" DECIMAL(12,2) NOT NULL,
    "newValue" DECIMAL(12,2) NOT NULL,
    "source" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BuyingPortal_name_key" ON "BuyingPortal"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryPart_code_key" ON "InventoryPart"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PortalCatalogLine_portalId_vendorSku_key" ON "PortalCatalogLine"("portalId", "vendorSku");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseBill_portalId_billNumber_key" ON "PurchaseBill"("portalId", "billNumber");

-- CreateIndex
CREATE INDEX "PurchaseBill_status_idx" ON "PurchaseBill"("status");

-- CreateIndex
CREATE INDEX "StockMovement_partId_createdAt_idx" ON "StockMovement"("partId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- AddForeignKey
ALTER TABLE "PortalCatalogLine" ADD CONSTRAINT "PortalCatalogLine_portalId_fkey" FOREIGN KEY ("portalId") REFERENCES "BuyingPortal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalCatalogLine" ADD CONSTRAINT "PortalCatalogLine_inventoryPartId_fkey" FOREIGN KEY ("inventoryPartId") REFERENCES "InventoryPart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBill" ADD CONSTRAINT "PurchaseBill_portalId_fkey" FOREIGN KEY ("portalId") REFERENCES "BuyingPortal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBillLine" ADD CONSTRAINT "PurchaseBillLine_billId_fkey" FOREIGN KEY ("billId") REFERENCES "PurchaseBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBillLine" ADD CONSTRAINT "PurchaseBillLine_inventoryPartId_fkey" FOREIGN KEY ("inventoryPartId") REFERENCES "InventoryPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_partId_fkey" FOREIGN KEY ("partId") REFERENCES "InventoryPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_billId_fkey" FOREIGN KEY ("billId") REFERENCES "PurchaseBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_partId_fkey" FOREIGN KEY ("partId") REFERENCES "InventoryPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateChangeLog" ADD CONSTRAINT "RateChangeLog_partId_fkey" FOREIGN KEY ("partId") REFERENCES "InventoryPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
