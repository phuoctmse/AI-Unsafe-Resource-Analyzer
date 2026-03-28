-- AlterTable
ALTER TABLE "ImageLog" ADD COLUMN     "reasonShort" TEXT,
ADD COLUMN     "modelVersion" TEXT,
ADD COLUMN     "labelSetVersion" TEXT,
ADD COLUMN     "thresholdsVersion" TEXT,
ADD COLUMN     "scoresFull" JSONB,
ADD COLUMN     "workerVersion" TEXT;
