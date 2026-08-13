-- CreateTable
CREATE TABLE "ShowroomWalkIn" (
    "id" TEXT NOT NULL,
    "enquiryDate" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "requiredModel" TEXT NOT NULL,
    "contactNumber" TEXT,
    "address" TEXT,
    "paymentMode" TEXT,
    "expectedPurchaseDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShowroomWalkIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShowroomWalkIn_enquiryDate_idx" ON "ShowroomWalkIn"("enquiryDate");
