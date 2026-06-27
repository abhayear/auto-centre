-- CreateTable
CREATE TABLE "ServiceCentreConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusKm" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "radiusCheckEnabled" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT NOT NULL DEFAULT 'Auto Galaxy Service Centre',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCentreConfig_pkey" PRIMARY KEY ("id")
);

-- Seed default service centre (Lalitpur showroom)
INSERT INTO "ServiceCentreConfig" ("id", "latitude", "longitude", "radiusKm", "radiusCheckEnabled", "label", "updatedAt")
VALUES ('default', 25.386945, 78.411017, 25, true, 'Auto Galaxy Service Centre', CURRENT_TIMESTAMP);
