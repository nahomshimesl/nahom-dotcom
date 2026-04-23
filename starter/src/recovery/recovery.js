/**
 * recovery/recovery.js
 *
 * Basic resilience layer. On critical errors it restores the last known good
 * snapshot of the simulation state and keeps the engine alive. Process-level
 * crashes (uncaughtException / unhandledRejection) are caught and logged
 * instead of taking the server down.
 */

import { logger } from "../monitoring/logger.js";
import { restore, snapshot, update } from "../state/store.js";
import * as engine from "../simulation/engine.js";

const RESET_AFTER_ERRORS_PER_MINUTE = 5;
const recentErrors = [];

function recordErrorAndMaybeRecover(entry) {
  const now = Date.now();
  recentErrors.push(now);
  // Drop entries older than 60s.
  while (recentErrors.length && now - recentErrors[0] > 60_000) recentErrors.shift();

  // Always remember the failure on the state object so clients can see it.
  update((draft) => {
    draft.lastError = { scope: entry.scope, message: entry.message, at: entry.ts };
  }, { reason: "error" });

  if (recentErrors.length >= RESET_AFTER_ERRORS_PER_MINUTE) {
    logger.warn("recovery", "error threshold exceeded — restoring last good snapshot", {
      errorsLastMinute: recentErrors.length,
    });
    restoreLastGood();
    recentErrors.length = 0;
  }
}

export function restoreLastGood() {
  const restored = restore();
  // Reset metrics that may have been corrupted but keep the simulation alive.
  if (!engine.isRunning()) engine.start();
  return restored;
}

export function startRecovery() {
  // Take an initial snapshot before anything goes wrong.
  snapshot();

  const off = logger.onError(recordErrorAndMaybeRecover);

  process.on("uncaughtException", (err) => {
    logger.error("process", "uncaughtException", { error: String(err?.message ?? err), stack: err?.stack });
  });
  process.on("unhandledRejection", (reason) => {
    const r = reason;
    logger.error("process", "unhandledRejection", { error: String(r?.message ?? r), stack: r?.stack });
  });

  return { stop: off };
}

export const recovery = { restoreLastGood, startRecovery };
