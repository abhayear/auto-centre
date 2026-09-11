-- CreateTable
CREATE TABLE "CreditNoteItcCase" (
    "id" TEXT NOT NULL,
    "purchaserName" TEXT NOT NULL,
    "purchaserGstin" TEXT NOT NULL,
    "purchaserAddress" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierGstin" TEXT NOT NULL,
    "originalInvoiceNumber" TEXT NOT NULL,
    "originalInvoiceDate" DATE NOT NULL,
    "creditNoteNumber" TEXT NOT NULL,
    "creditNoteDate" DATE NOT NULL,
    "itcAlreadyClaimed" BOOLEAN NOT NULL,
    "creditNoteKind" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "imsStatus" TEXT NOT NULL,
    "taxableValue" DOUBLE PRECISION NOT NULL,
    "cgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cess" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reversalPeriod" TEXT,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "declarationKind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdByEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditNoteItcCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditNoteItcCase_creditNoteDate_idx" ON "CreditNoteItcCase"("creditNoteDate");

-- CreateIndex
CREATE INDEX "CreditNoteItcCase_supplierGstin_idx" ON "CreditNoteItcCase"("supplierGstin");
