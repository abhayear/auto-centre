-- CreateTable
CREATE TABLE "HealthMinuteBucket" (
    "id" TEXT NOT NULL,
    "minute" TIMESTAMP(3) NOT NULL,
    "routeGroup" TEXT NOT NULL,
    "statusClass" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "totalDurationMs" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HealthMinuteBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthSnapshot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "overallStatus" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "HealthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthAlert" (
    "id" TEXT NOT NULL,
    "signal" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSentAt" TIMESTAMP(3),
    "recoveredAt" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "suggestedAction" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,

    CONSTRAINT "HealthAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthMinuteBucket_minute_idx" ON "HealthMinuteBucket"("minute");

-- CreateIndex
CREATE UNIQUE INDEX "HealthMinuteBucket_minute_routeGroup_statusClass_key" ON "HealthMinuteBucket"("minute", "routeGroup", "statusClass");

-- CreateIndex
CREATE INDEX "HealthSnapshot_createdAt_idx" ON "HealthSnapshot"("createdAt");

-- CreateIndex
CREATE INDEX "HealthAlert_signal_state_idx" ON "HealthAlert"("signal", "state");

-- CreateIndex
CREATE INDEX "HealthAlert_openedAt_idx" ON "HealthAlert"("openedAt");
