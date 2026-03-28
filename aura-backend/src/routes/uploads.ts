import type { Hono } from "hono";
import { handleUploadComplete, handleUploadPresign } from "../controllers/uploadsController";

export const registerUploadsRoutes = (app: Hono) => {
  app.post("/uploads/presign", handleUploadPresign);

  app.post("/uploads/complete", handleUploadComplete);
};

