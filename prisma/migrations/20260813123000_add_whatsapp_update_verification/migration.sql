CREATE TABLE "WhatsAppOtp" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WhatsAppOtp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UpdateSubscription" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "whatsappVerified" BOOLEAN NOT NULL DEFAULT true,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UpdateSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UpdateSubscription_phone_key" ON "UpdateSubscription"("phone");
CREATE INDEX "WhatsAppOtp_phone_expiresAt_idx" ON "WhatsAppOtp"("phone", "expiresAt");
