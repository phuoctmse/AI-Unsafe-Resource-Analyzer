import type { Context } from "hono";
import type { Server as SocketIOServer } from "socket.io";
import { timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";

import { config } from "../config";
import { getRequestId, log } from "../observability/logger";
import { isAppError } from "../utils/appError";
import { allowedScanStatuses, processWorkerCallback } from "../services/internalImageService";

const respondWithError = (c: Context, event: string, requestId: string, error: unknown, fallbackCode: string) => {
  if (isAppError(error)) {
    log("warn", event, {
      requestId,
      error: error.message,
      code: error.code,
    });

    return c.json(
      {
        success: false,
        error: error.code,
        details: error.details ?? error.message,
      },
      error.statusCode,
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    log("warn", event, { requestId, error: error.message, code: error.code });
    return c.json({ success: false, error: "image not found" }, 404);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    log("warn", event, { requestId, error: error.message });
    return c.json({ success: false, error: "invalid payload" }, 400);
  }

  const message = error instanceof Error ? error.message : String(error);
  log("error", event, { requestId, error: message });
  return c.json({ success: false, error: fallbackCode, details: message }, 500);
};

export const handleWorkerProcessedCallback = (io: SocketIOServer) => {
  return async (c: Context) => {
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
      topLabels?: unknown;
      reasonShort?: string | null;
      modelVersion?: string | null;
      labelSetVersion?: string | null;
      thresholdsVersion?: string | null;
      scoresFull?: unknown;
      workerVersion?: string | null;
      processedTimeMs?: number | null;
    }>();

    if (!imageId) {
      return c.json({ success: false, error: "imageId is required" }, 400);
    }

    if (!body.status || !allowedScanStatuses.includes(body.status as (typeof allowedScanStatuses)[number])) {
      return c.json({ success: false, error: "status must be one of PENDING|SAFE|UNSAFE|ERROR" }, 400);
    }

    try {
      log("info", "worker.callback.received", {
        requestId,
        imageId,
        status: body.status,
        processedTimeMs: body.processedTimeMs ?? null,
      });

      const updated = await processWorkerCallback(imageId, {
        status: body.status as (typeof allowedScanStatuses)[number],
        nsfwScore: body.nsfwScore ?? null,
        violenceScore: body.violenceScore ?? null,
        topLabels: body.topLabels as Prisma.InputJsonValue | undefined,
        reasonShort: body.reasonShort === undefined ? undefined : body.reasonShort,
        modelVersion: body.modelVersion === undefined ? undefined : body.modelVersion,
        labelSetVersion: body.labelSetVersion === undefined ? undefined : body.labelSetVersion,
        thresholdsVersion: body.thresholdsVersion === undefined ? undefined : body.thresholdsVersion,
        scoresFull: body.scoresFull as Prisma.InputJsonValue | undefined,
        workerVersion: body.workerVersion === undefined ? undefined : body.workerVersion,
        processedTimeMs: body.processedTimeMs ?? null,
      });

      io.emit("image:processed", { success: true, data: updated });
      log("info", "worker.callback.applied", {
        requestId,
        imageId,
        status: updated.status,
      });

      return c.json({ success: true, data: { imageId, status: updated.status } });
    } catch (error) {
      return respondWithError(c, "worker.callback.failed", requestId, error, "internal server error");
    }
  };
};