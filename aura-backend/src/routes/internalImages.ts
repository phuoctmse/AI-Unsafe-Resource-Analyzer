import type { Hono } from "hono";
import type { Server as SocketIOServer } from "socket.io";
import { ScanStatus } from "@prisma/client";
import { prisma } from "../db";

export const registerInternalImagesRoutes = (app: Hono, io: SocketIOServer) => {
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

      io.emit("image:processed", { success: true, data: updated });
      return c.json({ success: true, data: { imageId, status: updated.status } });
    } catch (err) {
      // Update throws when record doesn't exist.
      const message = err instanceof Error ? err.message : String(err);
      console.error("processed callback failed:", message);
      return c.json({ success: false, error: "image not found" }, 404);
    }
  });
};

