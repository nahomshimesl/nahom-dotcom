/**
 * realtime/socket.js
 *
 * Bridges the state store to connected clients via Socket.IO. The simulation
 * engine never imports anything from here — coupling stays one-directional:
 *   simulation → state → realtime → clients
 *
 * Throttles broadcasts to MAX_BROADCAST_HZ to avoid flooding the network if
 * the simulation tick rate is increased.
 */

import { Server } from "socket.io";
import { getState, subscribe } from "../state/store.js";
import { logger } from "../monitoring/logger.js";

const MAX_BROADCAST_HZ = Number(process.env.MAX_BROADCAST_HZ) || 20;
const MIN_INTERVAL_MS = Math.floor(1000 / MAX_BROADCAST_HZ);

export function attachRealtime(httpServer) {
  const io = new Server(httpServer, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    logger.info("realtime", "client connected", { id: socket.id });
    // Send current state on connect so new clients sync immediately.
    socket.emit("state", getState());
    socket.on("disconnect", (reason) =>
      logger.info("realtime", "client disconnected", { id: socket.id, reason }),
    );
  });

  let lastBroadcast = 0;
  let pending = null;

  function broadcast(state, meta) {
    const now = Date.now();
    const due = now - lastBroadcast;
    if (due >= MIN_INTERVAL_MS) {
      lastBroadcast = now;
      io.emit("state", state);
      if (meta?.reason && meta.reason !== "tick") io.emit("event", meta);
    } else if (!pending) {
      pending = setTimeout(() => {
        pending = null;
        lastBroadcast = Date.now();
        io.emit("state", getState());
      }, MIN_INTERVAL_MS - due);
    }
  }

  subscribe(broadcast);

  return io;
}
