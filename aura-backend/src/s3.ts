import { S3Client, CreateBucketCommand, HeadBucketCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { config } from "./config";

export const s3Client = new S3Client({
  region: config.s3Region,
  endpoint: config.s3Endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: config.s3AccessKey,
    secretAccessKey: config.s3SecretKey,
  },
});

let bucketReadyPromise: Promise<void> | undefined;

export const ensureBucket = async (): Promise<void> => {
  if (bucketReadyPromise) {
    await bucketReadyPromise;
    return;
  }

  bucketReadyPromise = (async () => {
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: config.s3Bucket }));
    } catch {
      await s3Client.send(new CreateBucketCommand({ Bucket: config.s3Bucket }));
    }
  })();

  await bucketReadyPromise;
};

export const buildImageUrl = (key: string): string => {
  // For MinIO/S3 compatible endpoints, a simple URL works for skeleton purposes.
  return `${config.s3Endpoint}/${config.s3Bucket}/${key}`;
};

export const presignPutObject = async (params: {
  key: string;
  contentType: string;
}): Promise<{ uploadUrl: string; imageUrl: string }> => {
  await ensureBucket();

  const command = new PutObjectCommand({
    Bucket: config.s3Bucket,
    Key: params.key,
    ContentType: params.contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
  const imageUrl = buildImageUrl(params.key);

  return { uploadUrl, imageUrl };
};

export const headObjectExists = async (key: string): Promise<boolean> => {
  await ensureBucket();
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: config.s3Bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
};

