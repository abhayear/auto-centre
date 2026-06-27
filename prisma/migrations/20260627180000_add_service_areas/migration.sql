-- AlterTable
ALTER TABLE "ServiceBooking" ADD COLUMN "customerArea" TEXT NOT NULL DEFAULT 'Unknown';

-- AlterTable: remove default after backfill
ALTER TABLE "ServiceBooking" ALTER COLUMN "customerArea" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ServiceArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pinCode" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceArea_pkey" PRIMARY KEY ("id")
);
