export type AppConfig = {
  backendPort: number;
  s3Bucket: string;
  s3Region: string;
  s3Endpoint: string;
  s3AccessKey: string;
  s3SecretKey: string;
  redisUrl: string;
  scanQueueKey: string;
  internalApiKey: string;
};

export const config: AppConfig = {
  backendPort: Number(process.env.BACKEND_PORT ?? 3001),
  s3Bucket: process.env.S3_BUCKET ?? "aura-images",
  s3Region: process.env.S3_REGION ?? "us-east-1",
  s3Endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
  s3AccessKey: process.env.S3_ACCESS_KEY ?? "aura",
  s3SecretKey: process.env.S3_SECRET_KEY ?? "aurasecret",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  scanQueueKey: process.env.SCAN_QUEUE_KEY ?? "aura:scanQueue",
  internalApiKey: process.env.INTERNAL_API_KEY ?? "aura-internal-api-key",
};

