/**
 * state/store.js
 *
 * Single source of truth for simulation state.
 *
 * - All mutations go through `update(reducer)` so we can log, snapshot, and
 *   broadcast changes from one place.
 * - `subscribe(listener)` lets the realtime layer (or anyone else) react to
 *   updates without coupling the producer and consumer.
 * - `snapshot()` / `restore(snap)` provide the "last known good state"
 *   primitive used by the recovery module.
 */

import { logger } from "../monitoring/logger.js";

const initialState = Object.freeze({
  tick: 0,
  running: false,
  startedAt: null,
  // Demo simulation entities. Replace with your own domain model.
  agents: [
    { id: "a1", energy: 100, position: 0 },
    { id: "a2", energy: 100, position: 0 },
    { id: "a3", energy: 100, position: 0 },
  ],
  metrics: { avgEnergy: 100, totalDistance: 0 },
  lastError: null,
});

let state = structuredClone(initialState);
const listeners = new Set();
let lastGoodSnapshot = structuredClone(state);

function deepFreeze(obj) {
  if (obj === null || typeof obj !== "object" || Object.isFrozen(obj)) return obj;
  for (const key of Object.keys(obj)) deepFreeze(obj[key]);
  return Object.freeze(obj);
}

/** Read-only, deep-frozen view. Mutations must go through `update()`. */
export function getState() {
  return deepFreeze(structuredClone(state));
}

/** Validate a snapshot shape before restoring. Returns true if usable. */
export function isValidSnapshot(snap) {
  return (
    snap && typeof snap === "object" &&
    typeof snap.tick === "number" &&
    Array.isArray(snap.agents) &&
    snap.metrics && typeof snap.metrics === "object"
  );
}

/**
 * Apply a reducer-style update. The reducer receives a deep clone, returns
 * the next state. We freeze nothing here so reducers stay ergonomic, but all
 * external readers go through `getState()` and should treat it as immutable.
 */
export function update(reducer, meta = {}) {
  const draft = structuredClone(state);
  const next = reducer(draft) ?? draft;
  state = next;
  for (const l of listeners) {
    try { l(state, meta); }
    catch (err) { logger.error("state.subscribe", "listener threw", { error: String(err) }); }
  }
  return state;
}

/** Subscribe to every committed update. Returns an unsubscribe fn. */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Capture a checkpoint of the current state (used by recovery). */
export function snapshot() {
  lastGoodSnapshot = structuredClone(state);
  return lastGoodSnapshot;
}

/** Restore the last good snapshot (or a provided one). Validates shape first. */
export function restore(snap = lastGoodSnapshot) {
  if (!isValidSnapshot(snap)) {
    logger.warn("state.restore", "invalid snapshot — falling back to initial state");
    return reset();
  }
  state = structuredClone(snap);
  // Snapshots capture domain state, not runtime flags — keep engine status sane.
  state.running = false;
  state.startedAt = null;
  for (const l of listeners) l(state, { reason: "restore" });
  return state;
}

/** Hard reset to initial state. */
export function reset() {
  state = structuredClone(initialState);
  lastGoodSnapshot = structuredClone(state);
  for (const l of listeners) l(state, { reason: "reset" });
  return state;
}
