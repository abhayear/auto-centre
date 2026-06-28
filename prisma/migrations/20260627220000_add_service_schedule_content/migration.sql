-- CreateTable
CREATE TABLE "ServiceScheduleContent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceScheduleContent_pkey" PRIMARY KEY ("id")
);
