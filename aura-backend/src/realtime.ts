import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";

export const setupSocketIO = (httpServer: unknown): SocketIOServer => {
  // `@hono/node-server` types can be narrower/different than Socket.io's expected http.Server type.
  // Runtime behavior is the same: Socket.io just needs a compatible Node server.
  const io = new SocketIOServer(httpServer as unknown as HttpServer, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    socket.emit("connected", { success: true, data: { message: "socket ready" } });
  });

  return io;
};

