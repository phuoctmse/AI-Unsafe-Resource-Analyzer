import { randomUUID } from "node:crypto";
import type { Hono } from "hono";
import { prisma } from "../db";
import { headObjectExists, presignPutObject } from "../s3";
import { enqueueScanTask } from "../queue";

export const registerUploadsRoutes = (app: Hono) => {
  app.post("/uploads/presign", async (c) => {
    try {
      const body = await c.req.json<{
        filename?: string;
        contentType?: string;
      }>();

      if (!body.filename || !body.contentType) {
        return c.json({ success: false, error: "filename and contentType are required" }, 400);
      }

      const imageId = randomUUID();
      const key = `${imageId}/${body.filename}`;

      const { uploadUrl, imageUrl } = await presignPutObject({
        key,
        contentType: body.contentType,
      });

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

  app.post("/uploads/complete", async (c) => {
    try {
      const body = await c.req.json<{
        imageId?: string;
        key?: string;
        force?: boolean;
      }>();

      if (!body.imageId || !body.key) {
        return c.json({ success: false, error: "imageId and key are required" }, 400);
      }

      const image = await prisma.imageLog.findUnique({
        where: { id: body.imageId },
        select: { id: true, imageUrl: true, status: true },
      });

      if (!image) {
        return c.json({ success: false, error: "image not found" }, 404);
      }

      const shouldEnqueue = body.force === true ? true : image.status === "PENDING";
      if (!shouldEnqueue) {
        return c.json({
          success: true,
          data: { imageId: image.id, status: image.status, enqueued: false },
        });
      }

      // Real pipeline trigger:
      // Only enqueue once the object exists in storage (MinIO/S3).
      const exists = await headObjectExists(body.key);
      if (!exists) {
        return c.json(
          { success: false, error: "object_not_found", details: "upload not yet available in storage" },
          409,
        );
      }

      // Skeleton idempotency: reset scan fields only when we are actually enqueueing.
      if (body.force === true || image.status !== "PENDING") {
        await prisma.imageLog.update({
          where: { id: image.id },
          data: { status: "PENDING", nsfwScore: null, violenceScore: null, processedTimeMs: null },
        });
      }

      await enqueueScanTask(image.id, image.imageUrl);

      return c.json({
        success: true,
        data: { imageId: image.id, status: "PENDING", enqueued: true },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("uploads complete failed:", message);
      return c.json({ success: false, error: "uploads_complete_failed", details: message }, 500);
    }
  });
};

