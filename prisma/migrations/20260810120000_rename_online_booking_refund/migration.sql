-- AlterTable
ALTER TABLE "Vehicle" RENAME COLUMN "visitorBookingReward" TO "onlineBookingRefund";

-- AlterTable
ALTER TABLE "Inquiry" RENAME COLUMN "rewardAmountAtBooking" TO "refundAmountAtBooking";
