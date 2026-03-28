import type { Context } from "hono";

import { getRequestId, log } from "../observability/logger";
import { isAppError } from "../utils/appError";
import { completeUpload, presignUpload } from "../services/uploadService";

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

  const message = error instanceof Error ? error.message : String(error);
  log("error", event, { requestId, error: message });
  return c.json({ success: false, error: fallbackCode, details: message }, 500);
};

export const handleUploadPresign = async (c: Context) => {
  const requestId = getRequestId(c.req.header("x-request-id"));

  try {
    const body = await c.req.json<{ filename?: string; contentType?: string }>();

    if (!body.filename || !body.contentType) {
      return c.json({ success: false, error: "filename and contentType are required" }, 400);
    }

    log("info", "upload.presign.requested", {
      requestId,
      filename: body.filename,
      contentType: body.contentType,
    });

    const result = await presignUpload({
      filename: body.filename,
      contentType: body.contentType,
    });

    log("info", "upload.presign.created", {
      requestId,
      imageId: result.imageId,
      key: result.key,
    });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return respondWithError(c, "upload.presign.failed", requestId, error, "presign_failed");
  }
};

export const handleUploadComplete = async (c: Context) => {
  const requestId = getRequestId(c.req.header("x-request-id"));

  try {
    const body = await c.req.json<{ imageId?: string; key?: string; force?: boolean }>();

    if (!body.imageId || !body.key) {
      return c.json({ success: false, error: "imageId and key are required" }, 400);
    }

    log("info", "upload.complete.requested", {
      requestId,
      imageId: body.imageId,
      key: body.key,
      force: body.force === true,
    });

    const result = await completeUpload({
      imageId: body.imageId,
      key: body.key,
      force: body.force,
    });

    if (!result.enqueued) {
      log("info", "upload.complete.skipped", {
        requestId,
        imageId: result.imageId,
        status: result.status,
      });
    } else {
      log("info", "upload.complete.enqueued", {
        requestId,
        imageId: result.imageId,
      });
    }

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return respondWithError(c, "upload.complete.failed", requestId, error, "uploads_complete_failed");
  }
};