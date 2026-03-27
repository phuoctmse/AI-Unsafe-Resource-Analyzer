import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { config } from "./config";
import { setupSocketIO } from "./realtime";
import { registerHealthRoutes } from "./routes/health";
import { registerInternalImagesRoutes } from "./routes/internal-Images";
import { registerImagesRoutes } from "./routes/images";
import { registerUploadsRoutes } from "./routes/uploads";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-request-id", "x-internal-key"],
  }),
);

const httpServer = serve({
  fetch: app.fetch,
  port: config.backendPort,
});

const io = setupSocketIO(httpServer);

registerHealthRoutes(app);
registerUploadsRoutes(app);
registerImagesRoutes(app);
registerInternalImagesRoutes(app, io);

// Minimal startup log for skeleton phase.
console.log(`aura-backend listening on http://localhost:${config.backendPort}`);
