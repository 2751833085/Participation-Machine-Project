/**
 * Router bridge: pages/router call `requestRoute()` without importing app.js.
 * Wired once from app.js with the real scheduler + executeRoute.
 */

let runSchedule = () => {};

export function wireAppRoute(fn) {
  runSchedule = typeof fn === "function" ? fn : () => {};
}

/** Coalesce navigations (hashchange + nav + auth) into one flush. */
export function requestRoute() {
  runSchedule();
}
