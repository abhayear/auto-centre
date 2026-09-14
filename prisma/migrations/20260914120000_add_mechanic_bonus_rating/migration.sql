-- CreateTable
CREATE TABLE "MechanicBonusRoster" (
    "id" TEXT NOT NULL,
    "mechanic1Name" TEXT NOT NULL DEFAULT '',
    "mechanic2Name" TEXT NOT NULL DEFAULT '',
    "mechanic3Name" TEXT NOT NULL DEFAULT '',
    "googleFormUrl" TEXT,
    "entryBillNo" TEXT,
    "entryMechanic1Name" TEXT,
    "entryMechanic1Rating" TEXT,
    "entryMechanic2Name" TEXT,
    "entryMechanic2Rating" TEXT,
    "entryMechanic3Name" TEXT,
    "entryMechanic3Rating" TEXT,
    "updatedByEmail" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MechanicBonusRoster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MechanicBonusRating" (
    "id" TEXT NOT NULL,
    "billNo" TEXT NOT NULL,
    "mechanic1Name" TEXT NOT NULL,
    "mechanic1Rating" INTEGER NOT NULL,
    "mechanic2Name" TEXT NOT NULL,
    "mechanic2Rating" INTEGER NOT NULL,
    "mechanic3Name" TEXT NOT NULL,
    "mechanic3Rating" INTEGER NOT NULL,
    "sentToGoogle" BOOLEAN NOT NULL DEFAULT false,
    "googleError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MechanicBonusRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MechanicBonusRating_createdAt_idx" ON "MechanicBonusRating"("createdAt");

-- CreateIndex
CREATE INDEX "MechanicBonusRating_billNo_idx" ON "MechanicBonusRating"("billNo");
