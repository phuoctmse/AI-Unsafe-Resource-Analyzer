import type { Hono } from "hono";
import type { Server as SocketIOServer } from "socket.io";
import { timingSafeEqual } from "node:crypto";
import { ScanStatus, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { getRequestId, log } from "../logger";
import { config } from "../config";

export const registerInternalImagesRoutes = (app: Hono, io: SocketIOServer) => {
  app.post("/internal/images/:id/processed", async (c) => {
    const requestId = getRequestId(c.req.header("x-request-id"));
    const expectedInternalKey = config.internalApiKey.trim();
    const providedInternalKey = c.req.header("x-internal-key")?.trim();

    if (!expectedInternalKey) {
      log("error", "worker.callback.unauthorized.internalKeyNotConfigured", { requestId });
      return c.json({ success: false, error: "internal server misconfigured" }, 500);
    }

    if (!providedInternalKey) {
      log("warn", "worker.callback.unauthorized.missingInternalKey", { requestId });
      return c.json({ success: false, error: "missing x-internal-key" }, 401);
    }

    const providedBuf = Buffer.from(providedInternalKey);
    const expectedBuf = Buffer.from(expectedInternalKey);
    const isValid = providedBuf.length === expectedBuf.length && timingSafeEqual(providedBuf, expectedBuf);

    if (!isValid) {
      log("warn", "worker.callback.unauthorized.invalidInternalKey", { requestId });
      return c.json({ success: false, error: "invalid x-internal-key" }, 403);
    }

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
      log("info", "worker.callback.received", {
        requestId,
        imageId,
        status,
        processedTimeMs: body.processedTimeMs ?? null,
      });

      const updated = await prisma.imageLog.update({
        where: { id: imageId },
        data: {
          status: status as ScanStatus,
          nsfwScore: body.nsfwScore ?? null,
          violenceScore: body.violenceScore ?? null,
          processedTimeMs: body.processedTimeMs ?? null,
        },
      });

      io.emit("image:processed", { success: true, data: updated });
      log("info", "worker.callback.applied", {
        requestId,
        imageId,
        status: updated.status,
      });
      return c.json({ success: true, data: { imageId, status: updated.status } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        log("warn", "worker.callback.imageNotFound", { requestId, imageId, code: err.code, meta: err.meta });
        return c.json({ success: false, error: "image not found" }, 404);
      }

      if (err instanceof Prisma.PrismaClientValidationError) {
        const message = err instanceof Error ? err.message : String(err);
        log("warn", "worker.callback.invalidPayload", { requestId, imageId, error: message });
        return c.json({ success: false, error: "invalid payload" }, 400);
      }

      const message = err instanceof Error ? err.message : String(err);
      log("error", "worker.callback.failed", { requestId, imageId, error: message });
      return c.json({ success: false, error: "internal server error" }, 500);
    }
  });
};

