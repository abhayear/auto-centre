-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL,
    "businessHours" TEXT NOT NULL DEFAULT '[]',
    "noticeText" TEXT,
    "noticeActive" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- Seed default business hours
INSERT INTO "SiteSettings" ("id", "businessHours", "noticeText", "noticeActive", "updatedAt")
VALUES (
    'default',
    '[{"day":"Monday – Saturday","hours":"9:00 AM – 7:00 PM"},{"day":"Sunday","hours":"10:00 AM – 5:00 PM"}]',
    NULL,
    false,
    CURRENT_TIMESTAMP
);
