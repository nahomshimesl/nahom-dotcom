/**
 * src/index.js
 *
 * Composition root. Wires the modules together but contains no business
 * logic of its own. Run with `npm install && npm start`.
 *
 *   simulation → state → realtime → clients
 *                  ↓
 *               logger → ai
 *                      → recovery
 */

import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

import { logger } from "./monitoring/logger.js";
import { createApiRouter } from "./api/routes.js";
import { attachRealtime } from "./realtime/socket.js";
import { startAiPipeline, analyzeError, recentIncidents } from "./ai/analyzer.js";
import { startRecovery, recovery } from "./recovery/recovery.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 5050;

const app = express();
app.use(express.json({ limit: "128kb" }));

// Lightweight request log so you can see traffic in the structured stream.
app.use((req, _res, next) => {
  logger.debug("http", `${req.method} ${req.url}`);
  next();
});

// Mount API with AI + recovery handles injected (loose coupling via DI).
app.use("/api", createApiRouter({
  ai: { analyzeError, recentIncidents },
  recovery,
}));

// Tiny demo client so you can see the realtime stream in a browser.
app.use(express.static(path.join(__dirname, "..", "public")));

const server = http.createServer(app);
attachRealtime(server);

// Background subsystems.
startAiPipeline();
startRecovery();

server.listen(PORT, "0.0.0.0", () => {
  logger.info("boot", "server listening", { port: PORT });
});

// Graceful shutdown so child timers/sockets don't keep the process alive.
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    logger.info("boot", "shutting down", { signal: sig });
    server.close(() => process.exit(0));
  });
}
