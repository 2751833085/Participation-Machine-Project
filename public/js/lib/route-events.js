/**
 * Router bridge: pages/router call `requestRoute()` without importing app.js.
 * Wired once from app.js with the real scheduler + executeRoute.
 */

let runSchedule = () => {};
let pendingRouteForce = false;

export function wireAppRoute(fn) {
  runSchedule = typeof fn === "function" ? fn : () => {};
}

/** @returns whether this flush was requested with `force` (same-hash re-render). */
export function takePendingRouteForce() {
  const f = pendingRouteForce;
  pendingRouteForce = false;
  return f;
}

/**
 * Coalesce navigations (hashchange + nav + auth) into one flush.
 * @param {boolean} [force] — when true, run `executeRoute` even if hash+auth match last flush (e.g. re-tap Create).
 */
export function requestRoute(force = false) {
  if (force) pendingRouteForce = true;
  runSchedule();
}
