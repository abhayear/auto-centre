-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN "visitorCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SiteSettings" ADD COLUMN "showVisitorCount" BOOLEAN NOT NULL DEFAULT true;
