/**
 * simulation/engine.js
 *
 * Pure simulation loop. Knows nothing about HTTP, sockets, or AI — it only
 * reads/writes through the state store and reports lifecycle events through
 * the logger. This isolation keeps the domain logic testable and swappable.
 *
 *   start()   — begin ticking on a fixed interval
 *   stop()    — halt the loop
 *   step()    — advance one tick (also called by the loop)
 */

import { getState, update, snapshot } from "../state/store.js";
import { logger } from "../monitoring/logger.js";

const TICK_MS = Number(process.env.SIM_TICK_MS) || 1000;
const SNAPSHOT_EVERY = 10; // capture a "last known good" every N ticks

let timer = null;

/** Advance the simulation by one tick. Pure-ish: only mutates via `update`. */
export function step() {
  return update((draft) => {
    draft.tick += 1;

    // Demo dynamics: each agent moves and burns a little energy. Occasionally
    // an agent's energy refreshes. Replace this with your real model.
    let totalDistance = 0;
    let energySum = 0;
    for (const agent of draft.agents) {
      const move = Math.round((Math.random() - 0.5) * 4);
      agent.position += move;
      totalDistance += Math.abs(move);
      agent.energy = Math.max(0, agent.energy - Math.random() * 1.5);
      if (agent.energy < 25 && Math.random() < 0.2) agent.energy = 100;
      energySum += agent.energy;
    }
    draft.metrics.avgEnergy = +(energySum / draft.agents.length).toFixed(2);
    draft.metrics.totalDistance += totalDistance;

    if (draft.tick % SNAPSHOT_EVERY === 0) {
      // Schedule snapshot after the update commits (microtask) so we capture
      // the post-update state, not the in-progress draft.
      queueMicrotask(snapshot);
    }
    return draft;
  }, { reason: "tick" });
}

export function start() {
  if (timer) return getState();
  update((draft) => { draft.running = true; draft.startedAt = Date.now(); });
  logger.info("simulation", "started", { tickMs: TICK_MS });
  timer = setInterval(() => {
    try { step(); }
    catch (err) {
      // Surface as an error log — recovery module will react via the bus.
      logger.error("simulation", "tick failed", { error: String(err?.message ?? err), stack: err?.stack });
    }
  }, TICK_MS);
  return getState();
}

export function stop() {
  if (!timer) return getState();
  clearInterval(timer);
  timer = null;
  update((draft) => { draft.running = false; });
  logger.info("simulation", "stopped");
  return getState();
}

export function isRunning() { return Boolean(timer); }
