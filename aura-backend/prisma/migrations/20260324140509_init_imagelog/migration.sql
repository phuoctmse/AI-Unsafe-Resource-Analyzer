-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'SAFE', 'UNSAFE', 'ERROR');

-- CreateTable
CREATE TABLE "ImageLog" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "status" "ScanStatus" NOT NULL DEFAULT 'PENDING',
    "nsfwScore" DOUBLE PRECISION,
    "violenceScore" DOUBLE PRECISION,
    "processedTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageLog_pkey" PRIMARY KEY ("id")
);
