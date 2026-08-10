-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "onlineBookingAmount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN "bookingAmountAtBooking" DOUBLE PRECISION;
ALTER TABLE "Inquiry" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'not_required';
ALTER TABLE "Inquiry" ADD COLUMN "paymentOrderId" TEXT;
ALTER TABLE "Inquiry" ADD COLUMN "paymentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Inquiry_paymentOrderId_key" ON "Inquiry"("paymentOrderId");
