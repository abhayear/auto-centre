-- AlterTable
ALTER TABLE "MechanicReferral" ADD COLUMN "referrerName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "referrerContact" TEXT NOT NULL DEFAULT '',
ADD COLUMN "hiredAt" TIMESTAMP(3),
ADD COLUMN "rewardedAt" TIMESTAMP(3);
