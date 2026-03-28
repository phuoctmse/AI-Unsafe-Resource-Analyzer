import type { Hono } from "hono";
import type { Server as SocketIOServer } from "socket.io";
import { handleWorkerProcessedCallback } from "../controllers/internalImagesController";

export const registerInternalImagesRoutes = (app: Hono, io: SocketIOServer) => {
  app.post("/internal/images/:id/processed", handleWorkerProcessedCallback(io));
};

