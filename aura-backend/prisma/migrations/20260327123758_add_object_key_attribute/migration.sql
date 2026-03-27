-- AlterTable
ALTER TABLE "ImageLog" ADD COLUMN     "objectKey" TEXT;

UPDATE "ImageLog"
SET "objectKey" = regexp_replace("imageUrl", '^https?://[^/]+/[^/]+/', '')
WHERE "objectKey" IS NULL;

ALTER TABLE "ImageLog" ALTER COLUMN "objectKey" SET NOT NULL;
