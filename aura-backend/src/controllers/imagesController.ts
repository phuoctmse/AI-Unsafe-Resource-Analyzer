import type { Context } from "hono";

import { getRequestId, log } from "../observability/logger";
import { listImages } from "../services/imageService";

export const handleImagesList = async (c: Context) => {
  const requestId = getRequestId(c.req.header("x-request-id"));
  const limitParam = c.req.query("limit");
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 50;

  const resolvedLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50;

  try {
    const images = await listImages(resolvedLimit);
    return c.json({ success: true, data: images });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("error", "images.list.failed", { requestId, error: message });
    return c.json({ success: false, error: "internal server error" }, 500);
  }
};