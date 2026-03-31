import type { Hono } from "hono";
import { handleImagesList } from "../controllers/imagesController";

export const registerImagesRoutes = (app: Hono) => {
  app.get("/images", handleImagesList);
};

