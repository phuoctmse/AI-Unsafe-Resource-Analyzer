import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { PrismaClient, ScanStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";
import { S3Client, PutObjectCommand, HeadBucketCommand, CreateBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import Redis from "ioredis";

const app = new Hono();
const port = Number(process.env.BACKEND_PORT ?? 3001);
const prisma = new PrismaClient();

const s3Bucket = process.env.S3_BUCKET ?? "aura-images";
const s3Region = process.env.S3_REGION ?? "us-east-1";
const s3Endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
const s3AccessKey = process.env.S3_ACCESS_KEY ?? "aura";
const s3SecretKey = process.env.S3_SECRET_KEY ?? "aurasecret";

const s3Client = new S3Client({
  region: s3Region,
  endpoint: s3Endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: s3AccessKey,
    secretAccessKey: s3SecretKey,
  },
});

let bucketReadyPromise: Promise<void> | undefined;

const ensureBucket = async (): Promise<void> => {
  if (bucketReadyPromise) {
    await bucketReadyPromise;
    return;
  }

  bucketReadyPromise = (async () => {
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: s3Bucket }));
    } catch {
      await s3Client.send(new CreateBucketCommand({ Bucket: s3Bucket }));
    }
  })();

  await bucketReadyPromise;
};

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const scanQueueKey = process.env.SCAN_QUEUE_KEY ?? "aura:scanQueue";
const redis = new Redis(redisUrl, { lazyConnect: true });

const httpServer = serve({
  fetch: app.fetch,
  port,
});

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  socket.emit("connected", { success: true, data: { message: "socket ready" } });
});

app.get("/health", (c) => {
  return c.json({ success: true, data: { service: "aura-backend", status: "ok" } });
});

app.post("/uploads/presign", async (c) => {
  try {
    const body = await c.req.json<{
      filename?: string;
      contentType?: string;
    }>();

    if (!body.filename || !body.contentType) {
      return c.json({ success: false, error: "filename and contentType are required" }, 400);
    }

    await ensureBucket();

    const imageId = randomUUID();
    const key = `${imageId}/${body.filename}`;
    const command = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: key,
      ContentType: body.contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    const imageUrl = `${s3Endpoint}/${s3Bucket}/${key}`;

    // Enqueue scan task as part of the Phase 3 skeleton.
    // In a full pipeline, this would be triggered after upload completion.
    await redis.rpush(scanQueueKey, JSON.stringify({ imageId, imageUrl }));

    await prisma.imageLog.create({
      data: {
        id: imageId,
        imageUrl,
        status: "PENDING",
      },
    });

    return c.json({
      success: true,
      data: {
        imageId,
        key,
        uploadUrl,
        imageUrl,
        expiresInSeconds: 300,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("presign failed:", message);
    return c.json({ success: false, error: "presign_failed", details: message }, 500);
  }
});

app.post("/internal/images/:id/processed", async (c) => {
  const imageId = c.req.param("id");
  const body = await c.req.json<{
    status?: string;
    nsfwScore?: number | null;
    violenceScore?: number | null;
    processedTimeMs?: number | null;
  }>();

  if (!imageId) {
    return c.json({ success: false, error: "imageId is required" }, 400);
  }

  const status = body.status;
  const allowedStatuses: ScanStatus[] = ["PENDING", "SAFE", "UNSAFE", "ERROR"];
  if (!status || !allowedStatuses.includes(status as ScanStatus)) {
    return c.json({ success: false, error: "status must be one of PENDING|SAFE|UNSAFE|ERROR" }, 400);
  }

  try {
    const updated = await prisma.imageLog.update({
      where: { id: imageId },
      data: {
        status: status as ScanStatus,
        nsfwScore: body.nsfwScore ?? null,
        violenceScore: body.violenceScore ?? null,
        processedTimeMs: body.processedTimeMs ?? null,
      },
    });

    // Broadcast to dashboard listeners.
    io.emit("image:processed", { success: true, data: updated });

    return c.json({ success: true, data: { imageId, status: updated.status } });
  } catch {
    return c.json({ success: false, error: "image not found" }, 404);
  }
});

// Minimal startup log for skeleton phase.
console.log(`aura-backend listening on http://localhost:${port}`);
