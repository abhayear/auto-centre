-- CreateTable
CREATE TABLE "CashBoxRecord" (
    "id" TEXT NOT NULL,
    "recordDate" DATE NOT NULL,
    "sessionNumber" INTEGER NOT NULL DEFAULT 1,
    "openingBalance" DOUBLE PRECISION NOT NULL,
    "takenHome" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashBoxRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashBoxEntry" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "business" TEXT,
    "paymentMethod" TEXT,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashBoxEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashBoxRecord_recordDate_idx" ON "CashBoxRecord"("recordDate");

-- CreateIndex
CREATE UNIQUE INDEX "CashBoxRecord_recordDate_sessionNumber_key" ON "CashBoxRecord"("recordDate", "sessionNumber");

-- AddForeignKey
ALTER TABLE "CashBoxEntry" ADD CONSTRAINT "CashBoxEntry_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "CashBoxRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
