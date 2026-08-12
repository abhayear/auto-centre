-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN "trackingCode" TEXT;
ALTER TABLE "JobApplication" ADD COLUMN "adminNotes" TEXT;

-- Backfill tracking codes for existing rows
UPDATE "JobApplication"
SET "trackingCode" = 'AG-' || UPPER(SUBSTRING("id" FROM LENGTH("id") - 5 FOR 6))
WHERE "trackingCode" IS NULL;

ALTER TABLE "JobApplication" ALTER COLUMN "trackingCode" SET NOT NULL;

CREATE UNIQUE INDEX "JobApplication_trackingCode_key" ON "JobApplication"("trackingCode");

-- CreateTable
CREATE TABLE "ApplicationActivity" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApplicationActivity_applicationId_createdAt_idx" ON "ApplicationActivity"("applicationId", "createdAt");

ALTER TABLE "ApplicationActivity" ADD CONSTRAINT "ApplicationActivity_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed initial activity for existing applications
INSERT INTO "ApplicationActivity" ("id", "applicationId", "type", "message", "status", "createdAt")
SELECT
  'act_' || "id",
  "id",
  'status_change',
  'Application received',
  "status",
  "createdAt"
FROM "JobApplication";
