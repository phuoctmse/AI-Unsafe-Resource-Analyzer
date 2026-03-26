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

import { log } from "./logger";

const DEFAULT_BACKEND_PORT = 3001;

const rawPort = process.env.BACKEND_PORT;
let resolvedPort = DEFAULT_BACKEND_PORT;
if (rawPort !== undefined) {
  const parsed = parseInt(rawPort, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    resolvedPort = parsed;
  } else {
    log("warn", "Invalid BACKEND_PORT, falling back to default", {
      raw: rawPort,
      default: DEFAULT_BACKEND_PORT,
    });
  }
}

export const config: AppConfig = {
  backendPort: resolvedPort,
  s3Bucket: process.env.S3_BUCKET ?? "aura-images",
  s3Region: process.env.S3_REGION ?? "us-east-1",
  s3Endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
  s3AccessKey: process.env.S3_ACCESS_KEY ?? "aura",
  s3SecretKey: process.env.S3_SECRET_KEY ?? "aurasecret",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  scanQueueKey: process.env.SCAN_QUEUE_KEY ?? "aura:scanQueue",
  internalApiKey: process.env.INTERNAL_API_KEY ?? "aura-internal-api-key",
};

