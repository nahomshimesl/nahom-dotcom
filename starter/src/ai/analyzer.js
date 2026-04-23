/**
 * ai/analyzer.js
 *
 * Mock AI error analyzer. Subscribes to the logger's error bus, classifies
 * each error with a heuristic, and stores a bounded list of incidents that
 * the API can expose.
 *
 * The AI layer is intentionally decoupled from the simulation engine — it
 * only consumes log events and exposes pure functions. To swap in a real
 * model later, replace `analyzeError` with an LLM call.
 */

import { logger } from "../monitoring/logger.js";

const MAX_INCIDENTS = 100;

const incidents = [];

/** Mock classification. Returns a structured analysis object. */
export async function analyzeError({ scope, message = "", stack = "" }) {
  const text = `${message} ${stack}`.toLowerCase();
  let category = "Unknown";
  let suggestion = "Investigate the error manually.";
  let confidence = 0.3;

  if (/timeout|econn|network|fetch/.test(text)) {
    category = "Network";
    suggestion = "Retry with exponential backoff and surface a degraded-mode UI.";
    confidence = 0.7;
  } else if (/undefined|null|cannot read|is not a function/.test(text)) {
    category = "State";
    suggestion = "Add defensive guards and verify state initialization order.";
    confidence = 0.65;
  } else if (/memory|heap|out of memory/.test(text)) {
    category = "Memory";
    suggestion = "Audit retained references; consider snapshotting and resetting.";
    confidence = 0.6;
  } else if (/permission|unauthor|forbidden|401|403/.test(text)) {
    category = "Auth";
    suggestion = "Re-validate credentials and re-issue tokens.";
    confidence = 0.7;
  }

  return {
    scope,
    message,
    category,
    suggestion,
    confidence,
    analyzedAt: new Date().toISOString(),
  };
}

export function recentIncidents() {
  return incidents.slice().reverse();
}

/**
 * Wire the analyzer to the logger's error stream. Each error becomes an
 * incident with attached AI analysis.
 */
export function startAiPipeline() {
  return logger.onError(async (entry) => {
    try {
      const analysis = await analyzeError({
        scope: entry.scope,
        message: entry.message,
        stack: entry.data?.stack ?? "",
      });
      const incident = { ...entry, analysis };
      incidents.push(incident);
      if (incidents.length > MAX_INCIDENTS) incidents.shift();
      logger.info("ai", "incident analyzed", { scope: entry.scope, category: analysis.category });
    } catch (err) {
      // Use console directly to avoid an analyze-error feedback loop.
      console.warn("[ai] analyzer failed:", err);
    }
  });
}
