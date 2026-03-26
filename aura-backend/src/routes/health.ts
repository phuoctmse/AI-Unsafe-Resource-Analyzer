import type { Hono } from "hono";

export const registerHealthRoutes = (app: Hono) => {
  app.get("/health", (c) => {
    return c.json({ success: true, data: { service: "aura-backend", status: "ok" } });
  });
};

