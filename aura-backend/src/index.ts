import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { config } from "./config";
import { setupSocketIO } from "./integrations/realtime/socketio";
import { registerHealthRoutes } from "./routes/health";
import { registerInternalImagesRoutes } from "./routes/internal-Images";
import { registerImagesRoutes } from "./routes/images";
import { registerUploadsRoutes } from "./routes/uploads";

const app = new Hono();

const dashboardCors = cors({
  origin: (origin) => {
    if (!origin) return "*";
    return config.dashboardCorsOrigins.includes(origin) ? origin : null;
  },
  allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "x-request-id", "x-internal-key"],
  credentials: true,
});

app.use("*", dashboardCors);

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
