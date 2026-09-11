-- CreateTable
CREATE TABLE "CashBoxAuditLog" (
    "id" TEXT NOT NULL,
    "recordId" TEXT,
    "action" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "actorRole" TEXT,
    "summary" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashBoxAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashBoxAuditLog_recordId_idx" ON "CashBoxAuditLog"("recordId");

-- CreateIndex
CREATE INDEX "CashBoxAuditLog_createdAt_idx" ON "CashBoxAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "CashBoxAuditLog" ADD CONSTRAINT "CashBoxAuditLog_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "CashBoxRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
