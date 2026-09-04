-- CreateTable
CREATE TABLE "SiteCampaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "badgeLabel" TEXT,
    "ctaHref" TEXT NOT NULL DEFAULT '/vehicles',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedByEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteCampaign_published_startsAt_endsAt_idx" ON "SiteCampaign"("published", "startsAt", "endsAt");
