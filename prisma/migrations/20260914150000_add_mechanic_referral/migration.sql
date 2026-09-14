-- CreateTable
CREATE TABLE "MechanicReferral" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactNo" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "yearsOfExpertise" INTEGER NOT NULL,
    "expertise" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MechanicReferral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MechanicReferral_createdAt_idx" ON "MechanicReferral"("createdAt");
