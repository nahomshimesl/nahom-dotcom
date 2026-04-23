/**
 * monitoring/logger.js
 *
 * Structured, console-based logger plus a tiny in-process error bus.
 * Other modules call `logger.error(...)` and the bus relays the event to any
 * subscriber (e.g. the AI analyzer or recovery module) without those modules
 * having to know about each other.
 *
 * Integration points:
 *   - logger.onError(handler)  — subscribe to error events
 *   - logger.{debug,info,warn,error}(scope, message, data?)
 */

import { EventEmitter } from "node:events";

const bus = new EventEmitter();
bus.setMaxListeners(50);

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel = LEVELS[(process.env.LOG_LEVEL || "info").toLowerCase()] ?? LEVELS.info;

function emit(level, scope, message, data) {
  if (LEVELS[level] < minLevel) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    ...(data !== undefined ? { data } : {}),
  };
  // Single structured line — easy to pipe into any log collector later.
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
  if (level === "error") bus.emit("error", entry);
}

export const logger = {
  debug: (scope, message, data) => emit("debug", scope, message, data),
  info: (scope, message, data) => emit("info", scope, message, data),
  warn: (scope, message, data) => emit("warn", scope, message, data),
  error: (scope, message, data) => emit("error", scope, message, data),
  /** Subscribe to error log entries. Returns an unsubscribe function. */
  onError(handler) {
    bus.on("error", handler);
    return () => bus.off("error", handler);
  },
};
