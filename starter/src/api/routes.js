/**
 * api/routes.js
 *
 * HTTP control surface. Thin wrapper that delegates to the simulation engine
 * and state store. Returns plain JSON; no business logic lives here.
 */

import { Router } from "express";
import * as engine from "../simulation/engine.js";
import { getState, reset } from "../state/store.js";
import { logger } from "../monitoring/logger.js";

/**
 * Optional bearer-token guard for mutating endpoints. If `API_TOKEN` is unset
 * the guard is a no-op (convenient for local dev); set it in production to
 * lock down simulation control.
 */
function requireToken(req, res, next) {
  const expected = process.env.API_TOKEN;
  if (!expected) return next();
  const got = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (got !== expected) return res.status(401).json({ ok: false, error: "unauthorized" });
  next();
}

export function createApiRouter({ ai, recovery } = {}) {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true, running: engine.isRunning(), tick: getState().tick });
  });

  router.get("/state", (_req, res) => res.json(getState()));

  router.post("/simulation/start", requireToken, (_req, res) => {
    const state = engine.start();
    res.json({ ok: true, state });
  });

  router.post("/simulation/stop", requireToken, (_req, res) => {
    const state = engine.stop();
    res.json({ ok: true, state });
  });

  router.post("/simulation/reset", requireToken, (_req, res) => {
    engine.stop();
    const state = reset();
    res.json({ ok: true, state });
  });

  // AI / recovery management endpoints (optional; only mounted if injected).
  if (ai) {
    router.get("/ai/incidents", (_req, res) => res.json(ai.recentIncidents()));
    router.post("/ai/analyze", async (req, res) => {
      try {
        const { message, stack, scope } = req.body ?? {};
        const result = await ai.analyzeError({ scope: scope ?? "manual", message, stack });
        res.json(result);
      } catch (err) {
        logger.error("api.ai", "analyze failed", { error: String(err) });
        res.status(500).json({ ok: false, error: String(err?.message ?? err) });
      }
    });
  }

  if (recovery) {
    router.post("/recovery/restore", requireToken, (_req, res) => {
      const state = recovery.restoreLastGood();
      res.json({ ok: true, state });
    });
  }

  return router;
}
