import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";
import { S3Client, PutObjectCommand, HeadBucketCommand, CreateBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

app.get("/health", (c) => {
  return c.json({ success: true, data: { service: "aura-backend", status: "ok" } });
});

app.post("/uploads/presign", async (c) => {
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
});

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

// Minimal startup log for skeleton phase.
console.log(`aura-backend listening on http://localhost:${port}`);
