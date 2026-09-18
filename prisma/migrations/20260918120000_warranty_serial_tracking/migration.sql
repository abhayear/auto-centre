-- CreateTable
CREATE TABLE "WarrantyCustomer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "altPhone" TEXT,
    "address" TEXT,
    "area" TEXT,
    "distanceKm" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarrantyCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EBike" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "bikeNumber" TEXT NOT NULL,
    "chassisNumber" TEXT,
    "modelName" TEXT,
    "saleDate" DATE NOT NULL,
    "invoiceNumber" TEXT,
    "invoiceDate" DATE,
    "warrantyStartBasis" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EBike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarrantyComponent" (
    "id" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "modelCode" TEXT,
    "ah" DOUBLE PRECISION,
    "voltage" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'sold_with_bike',
    "status" TEXT NOT NULL DEFAULT 'installed',
    "currentBikeId" TEXT,
    "warrantyStartDate" DATE,
    "warrantyMonths" INTEGER,
    "replacedComponentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarrantyComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'plant',
    "address" TEXT,
    "contactPhone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentEvent" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "occurredAt" DATE NOT NULL,
    "bikeId" TEXT,
    "claimId" TEXT,
    "locationId" TEXT,
    "note" TEXT,
    "actorEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComponentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarrantyPolicy" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "batteryMonths" INTEGER NOT NULL DEFAULT 36,
    "chargerMonths" INTEGER NOT NULL DEFAULT 12,
    "motorMonths" INTEGER NOT NULL DEFAULT 36,
    "controllerMonths" INTEGER NOT NULL DEFAULT 36,
    "startBasis" TEXT NOT NULL DEFAULT 'sale_date',
    "expiringSoonDays" INTEGER NOT NULL DEFAULT 30,
    "companyDelayDays" INTEGER NOT NULL DEFAULT 21,
    "nearbyKm" INTEGER NOT NULL DEFAULT 10,
    "escalationDays" INTEGER NOT NULL DEFAULT 21,
    "updatedByEmail" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarrantyPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimDocument" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedByEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimDocument_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ReplacementClaim" ADD COLUMN "customerId" TEXT;
ALTER TABLE "ReplacementClaim" ADD COLUMN "bikeId" TEXT;
ALTER TABLE "ReplacementClaim" ADD COLUMN "faultyComponentId" TEXT;
ALTER TABLE "ReplacementClaim" ADD COLUMN "replacementComponentId" TEXT;
ALTER TABLE "ReplacementClaim" ADD COLUMN "companyLocationId" TEXT;
ALTER TABLE "ReplacementClaim" ADD COLUMN "returnType" TEXT;
ALTER TABLE "ReplacementClaim" ADD COLUMN "expectedReturnDate" DATE;
ALTER TABLE "ReplacementClaim" ADD COLUMN "installedAt" DATE;
ALTER TABLE "ReplacementClaim" ADD COLUMN "codedAt" DATE;
ALTER TABLE "ReplacementClaim" ADD COLUMN "codingRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WarrantyCustomer_phone_key" ON "WarrantyCustomer"("phone");
CREATE INDEX "WarrantyCustomer_name_idx" ON "WarrantyCustomer"("name");
CREATE UNIQUE INDEX "EBike_bikeNumber_key" ON "EBike"("bikeNumber");
CREATE INDEX "EBike_customerId_idx" ON "EBike"("customerId");
CREATE INDEX "EBike_chassisNumber_idx" ON "EBike"("chassisNumber");
CREATE UNIQUE INDEX "WarrantyComponent_serialNumber_key" ON "WarrantyComponent"("serialNumber");
CREATE INDEX "WarrantyComponent_componentType_idx" ON "WarrantyComponent"("componentType");
CREATE INDEX "WarrantyComponent_status_idx" ON "WarrantyComponent"("status");
CREATE INDEX "WarrantyComponent_currentBikeId_idx" ON "WarrantyComponent"("currentBikeId");
CREATE INDEX "WarrantyComponent_modelCode_idx" ON "WarrantyComponent"("modelCode");
CREATE UNIQUE INDEX "CompanyLocation_name_key" ON "CompanyLocation"("name");
CREATE INDEX "ComponentEvent_componentId_occurredAt_idx" ON "ComponentEvent"("componentId", "occurredAt");
CREATE INDEX "ComponentEvent_claimId_idx" ON "ComponentEvent"("claimId");
CREATE INDEX "ClaimDocument_claimId_idx" ON "ClaimDocument"("claimId");
CREATE INDEX "ReplacementClaim_customerId_idx" ON "ReplacementClaim"("customerId");
CREATE INDEX "ReplacementClaim_bikeId_idx" ON "ReplacementClaim"("bikeId");
CREATE INDEX "ReplacementClaim_faultyComponentId_idx" ON "ReplacementClaim"("faultyComponentId");

-- AddForeignKey
ALTER TABLE "EBike" ADD CONSTRAINT "EBike_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "WarrantyCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarrantyComponent" ADD CONSTRAINT "WarrantyComponent_currentBikeId_fkey" FOREIGN KEY ("currentBikeId") REFERENCES "EBike"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WarrantyComponent" ADD CONSTRAINT "WarrantyComponent_replacedComponentId_fkey" FOREIGN KEY ("replacedComponentId") REFERENCES "WarrantyComponent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComponentEvent" ADD CONSTRAINT "ComponentEvent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "WarrantyComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComponentEvent" ADD CONSTRAINT "ComponentEvent_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "EBike"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComponentEvent" ADD CONSTRAINT "ComponentEvent_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "ReplacementClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComponentEvent" ADD CONSTRAINT "ComponentEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "CompanyLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClaimDocument" ADD CONSTRAINT "ClaimDocument_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "ReplacementClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReplacementClaim" ADD CONSTRAINT "ReplacementClaim_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "WarrantyCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReplacementClaim" ADD CONSTRAINT "ReplacementClaim_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "EBike"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReplacementClaim" ADD CONSTRAINT "ReplacementClaim_faultyComponentId_fkey" FOREIGN KEY ("faultyComponentId") REFERENCES "WarrantyComponent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReplacementClaim" ADD CONSTRAINT "ReplacementClaim_replacementComponentId_fkey" FOREIGN KEY ("replacementComponentId") REFERENCES "WarrantyComponent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReplacementClaim" ADD CONSTRAINT "ReplacementClaim_companyLocationId_fkey" FOREIGN KEY ("companyLocationId") REFERENCES "CompanyLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the plant master and the single policy row
INSERT INTO "CompanyLocation" ("id", "name", "kind") VALUES
    ('loc_sirsa', 'Sirsa', 'company'),
    ('loc_dabra', 'Dabra Plant', 'plant'),
    ('loc_delhi', 'Delhi Plant', 'plant')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "WarrantyPolicy" ("id", "updatedAt") VALUES ('default', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
