-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN "heroImageUrl" TEXT,
ADD COLUMN "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "EsteemedCustomer" ADD COLUMN "photoUrl" TEXT;
