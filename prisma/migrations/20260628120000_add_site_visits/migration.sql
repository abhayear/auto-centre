-- CreateTable
CREATE TABLE "SiteVisit" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "device" TEXT,
    "referer" TEXT,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteVisit_visitedAt_idx" ON "SiteVisit"("visitedAt");

-- CreateIndex
CREATE INDEX "SiteVisit_path_idx" ON "SiteVisit"("path");
