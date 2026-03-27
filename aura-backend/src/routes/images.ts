import type { Hono } from "hono";
import { prisma } from "../db";
import { getRequestId, log } from "../logger";

export const registerImagesRoutes = (app: Hono) => {
  app.get("/images", async (c) => {
    const requestId = getRequestId(c.req.header("x-request-id"));
    const limitParam = c.req.query("limit");
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 50;

    const resolvedLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50;

    try {
      const images = await prisma.imageLog.findMany({
        orderBy: { createdAt: "desc" },
        take: resolvedLimit,
      });

      return c.json({ success: true, data: images });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log("error", "images.list.failed", { requestId, error: message });
      return c.json({ success: false, error: "internal server error" }, 500);
    }
  });
};

