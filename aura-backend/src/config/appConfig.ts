import { log } from "../observability/logger";

export type AppConfig = {
  backendPort: number;
  dashboardCorsOrigins: string[];
  s3Bucket: string;
  s3Region: string;
  s3Endpoint: string;
  s3PublicUrl: string;
  s3AccessKey: string;
  s3SecretKey: string;
  redisUrl: string;
  scanQueueKey: string;
  internalApiKey: string;
};

const DEFAULT_BACKEND_PORT = 3001;

const DEFAULT_DASHBOARD_CORS_ORIGINS = ["http://localhost:3000"];

const parseDashboardCorsOrigins = (raw: string | undefined): string[] => {
  if (!raw) return DEFAULT_DASHBOARD_CORS_ORIGINS;

  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .filter((origin) => {
      try {
        const parsed = new URL(origin);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        log("warn", "Invalid DASHBOARD_CORS_ORIGINS entry, skipping", { origin });
        return false;
      }
    });

  return origins.length > 0 ? origins : DEFAULT_DASHBOARD_CORS_ORIGINS;
};

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
  dashboardCorsOrigins: parseDashboardCorsOrigins(process.env.DASHBOARD_CORS_ORIGINS),
  s3Bucket: process.env.S3_BUCKET ?? "aura-images",
  s3Region: process.env.S3_REGION ?? "us-east-1",
  s3Endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
  s3PublicUrl: process.env.S3_PUBLIC_URL ?? process.env.S3_ENDPOINT ?? "http://localhost:9000",
  s3AccessKey: process.env.S3_ACCESS_KEY ?? "aura",
  s3SecretKey: process.env.S3_SECRET_KEY ?? "aurasecret",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  scanQueueKey: process.env.SCAN_QUEUE_KEY ?? "aura:scanQueue",
  internalApiKey: process.env.INTERNAL_API_KEY ?? "aura-internal-api-key",
};
