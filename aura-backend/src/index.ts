import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { Server } from "socket.io";

const app = new Hono();
const port = Number(process.env.BACKEND_PORT ?? 3001);

app.get("/health", (c) => {
  return c.json({ success: true, data: { service: "aura-backend", status: "ok" } });
});

const httpServer = serve({
  fetch: app.fetch,
  port,
});

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  socket.emit("connected", { success: true, data: { message: "socket ready" } });
});

// Minimal startup log for skeleton phase.
console.log(`aura-backend listening on http://localhost:${port}`);
