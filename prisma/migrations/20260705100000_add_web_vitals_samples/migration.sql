-- CreateTable
CREATE TABLE "WebVitalsSample" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "rating" TEXT NOT NULL,
    "path" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebVitalsSample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebVitalsSample_createdAt_idx" ON "WebVitalsSample"("createdAt");

-- CreateIndex
CREATE INDEX "WebVitalsSample_name_createdAt_idx" ON "WebVitalsSample"("name", "createdAt");
