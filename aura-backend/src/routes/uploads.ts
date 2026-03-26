import { randomUUID } from "node:crypto";
import type { Hono } from "hono";
import { prisma } from "../db";
import { headObjectExists, presignPutObject } from "../s3";
import { enqueueScanTask } from "../queue";
import { getRequestId, log } from "../logger";
import { config } from "../config";

export const registerUploadsRoutes = (app: Hono) => {
  app.post("/uploads/presign", async (c) => {
    const requestId = getRequestId(c.req.header("x-request-id"));
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

      log("info", "upload.presign.requested", {
        requestId,
        imageId,
        key,
        contentType: body.contentType,
      });

      const { uploadUrl, imageUrl, objectKey } = await presignPutObject({
        key,
        contentType: body.contentType,
      });

      await prisma.imageLog.create({
        data: {
          id: imageId,
          imageUrl,
          objectKey,
          status: "PENDING",
        },
      });

      log("info", "upload.presign.created", {
        requestId,
        imageId,
        key,
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
      log("error", "upload.presign.failed", { requestId, error: message });
      return c.json({ success: false, error: "presign_failed", details: message }, 500);
    }
  });

  app.post("/uploads/complete", async (c) => {
    const requestId = getRequestId(c.req.header("x-request-id"));
    try {
      const body = await c.req.json<{
        imageId?: string;
        key?: string;
        force?: boolean;
      }>();

      if (!body.imageId || !body.key) {
        return c.json({ success: false, error: "imageId and key are required" }, 400);
      }

      log("info", "upload.complete.requested", {
        requestId,
        imageId: body.imageId,
        key: body.key,
        force: body.force === true,
      });

      const image = await prisma.imageLog.findUnique({
        where: { id: body.imageId },
        select: { id: true, imageUrl: true, status: true, objectKey: true },
      });

      if (!image) {
        log("warn", "upload.complete.image_not_found", { requestId, imageId: body.imageId });
        return c.json({ success: false, error: "image not found" }, 404);
      }

      if (body.key !== image.objectKey) {
        log("warn", "upload.complete.key_mismatch", {
          requestId,
          imageId: image.id,
        });
        return c.json({ success: false, error: "key_mismatch" }, 400);
      }

      const shouldEnqueue = body.force === true ? true : image.status === "PENDING";
      if (!shouldEnqueue) {
        log("info", "upload.complete.skipped", {
          requestId,
          imageId: image.id,
          status: image.status,
        });
        return c.json({
          success: true,
          data: { imageId: image.id, status: image.status, enqueued: false },
        });
      }

      // Real pipeline trigger:
      // Only enqueue once the object exists in storage (MinIO/S3).
      // Important: verify existence of the stored key, not the client-provided key.
      // This prevents clients from bypassing the upload gate by submitting an arbitrary S3 key.
      const exists = await headObjectExists(image.objectKey);
      if (!exists) {
        log("warn", "upload.complete.object_not_found", {
          requestId,
          imageId: image.id,
          key: image.objectKey,
        });
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

      log("info", "upload.complete.enqueued", {
        requestId,
        imageId: image.id,
        queueKey: config.scanQueueKey,
      });

      return c.json({
        success: true,
        data: { imageId: image.id, status: "PENDING", enqueued: true },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log("error", "upload.complete.failed", { requestId, error: message });
      return c.json({ success: false, error: "uploads_complete_failed", details: message }, 500);
    }
  });
};

